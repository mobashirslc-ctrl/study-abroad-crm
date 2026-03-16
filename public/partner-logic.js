import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');
    if (!user) {
        window.location.replace("index.html");
    } else {
        if(loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        startDashboard(user); 
    }
});

function startDashboard(currentUser) {
    const updateHeader = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if(userDoc.exists()) safeSetText('welcomePartner', `Welcome, ${userDoc.data().fullName || 'Partner'}`);
    };
    updateHeader();

    // ১. রিয়েল-টাইম ট্র্যাকিং লিসেনার
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email), orderBy("timestamp", "desc"));
    onSnapshot(qApp, (snap) => {
        let pending = 0, available = 0, hRows = "", fRows = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : '#ffcc00';

            hRows += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:${statusColor}">${d.status}</span></td><td>${dateStr}</td></tr>`;
            fRows += `<tr><td>${d.studentName}</td><td>${d.contact}</td><td>${d.passport}</td><td><b style="color:${statusColor}">${d.status}</b></td><td>${d.compliancePerson || 'Pending'}</td><td><a href="${d.passportUrl}" target="_blank" style="color:var(--gold)">Docs</a></td><td>${dateStr}</td></tr>`;
        });
        safeSetText('pendingAm', `৳ ${pending.toLocaleString()}`);
        safeSetText('availAm', `৳ ${available.toLocaleString()}`);
        safeSetText('walletDisplay', `৳ ${available.toLocaleString()}`);
        if(document.getElementById('homeLiveBody')) document.getElementById('homeLiveBody').innerHTML = hRows;
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = fRows;
    });

    // ২. সার্চ ও কমিশন লজিক (Fixed Result Display)
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        searchBtn.onclick = async () => {
            const countryIn = document.getElementById('fCountry').value.trim().toLowerCase();
            const gpaIn = parseFloat(document.getElementById('fAcad').value) || 0;
            const resBody = document.getElementById('searchResultBody');
            document.getElementById('searchResultCard').style.display = 'block';
            resBody.innerHTML = '<tr><td colspan="11">Searching...</td></tr>';

            const snap = await getDocs(collection(db, "universities"));
            let html = "";
            snap.forEach(uDoc => {
                const u = uDoc.data();
                if ((u.country || "").toLowerCase().includes(countryIn) && gpaIn >= (parseFloat(u.minGPA) || 0)) {
                    const commBDT = (parseFloat(u.semesterFee || 0) * (parseFloat(u.partnerComm || 0) / 100)) * 120;
                    html += `<tr>
                        <td style="color:var(--gold)">${u.universityName || u.name}</td>
                        <td>${u.country}</td><td>${u.courseName || 'N/A'}</td><td>${u.intake || 'N/A'}</td>
                        <td>${u.minGPA}</td><td>${u.ielts}</td><td>${u.duolingo}</td><td>${u.pte}</td><td>${u.moi}</td>
                        <td style="color:var(--success)">৳ ${commBDT.toLocaleString()}</td>
                        <td><button class="btn-gold" style="padding:5px 10px; font-size:10px;" onclick="openFileApply('${uDoc.id}', '${u.universityName || u.name}')">Apply File</button></td>
                    </tr>`;
                }
            });
            resBody.innerHTML = html || '<tr><td colspan="11">No Match Found.</td></tr>';
        };
    }

    // ৩. ফাইল সাবমিশন লজিক (PDF Upload + QR Slip)
    window.openFileApply = (id, name) => {
        document.getElementById('sUniInput').value = name;
        document.getElementById('applyModal').style.display = 'flex';
    };

    window.closeModal = () => document.getElementById('applyModal').style.display = 'none';

    document.getElementById('submitApplication').onclick = async () => {
        const sName = document.getElementById('sNameInput').value;
        const sPassport = document.getElementById('sPassportInput').value;
        const sPhone = document.getElementById('sPhoneInput').value;
        const sUni = document.getElementById('sUniInput').value;

        const fPass = document.getElementById('fPassport').files[0];
        const fAcad = document.getElementById('fAcademic').files[0];
        const fLang = document.getElementById('fLanguage').files[0];

        if(!sName || !sPassport || !fPass) { alert("Please fill info and upload Passport PDF!"); return; }

        document.getElementById('submitApplication').innerText = "Uploading Files...";
        document.getElementById('submitApplication').disabled = true;

        try {
            // ফাইল আপলোড লজিক
            const upFile = async (file, folder) => {
                const sRef = ref(storage, `applications/${Date.now()}_${folder}_${file.name}`);
                await uploadBytes(sRef, file);
                return getDownloadURL(sRef);
            };

            const pUrl = await upFile(fPass, "passport");
            const aUrl = fAcad ? await upFile(fAcad, "academic") : "#";
            const lUrl = fLang ? await upFile(fLang, "language") : "#";

            const docRef = await addDoc(collection(db, "applications"), {
                studentName: sName, passport: sPassport, contact: sPhone, university: sUni,
                partnerEmail: currentUser.email, status: "INCOMING", timestamp: serverTimestamp(),
                passportUrl: pUrl, academicUrl: aUrl, languageUrl: lUrl,
                pendingAmount: 0, finalAmount: 0
            });

            showSlip(docRef.id, sName, sUni);
        } catch (e) { alert(e.message); document.getElementById('submitApplication').disabled = false; }
    };

    function showSlip(id, name, uni) {
        document.getElementById('applyModal').style.display = 'none';
        document.getElementById('slipModal').style.display = 'flex';
        const appID = "SCC-" + id.substring(0, 6).toUpperCase();
        document.getElementById('slipID').innerText = appID;
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        document.querySelector('#qrcode img').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=AppID:${appID}-Student:${name}`;
    }

    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}

function safeSetText(id, val) { if(document.getElementById(id)) document.getElementById(id).innerText = val; }