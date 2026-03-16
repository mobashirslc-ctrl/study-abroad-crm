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

// Global State
let currentAvailableBalance = 0;

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
    // ১. রিয়েল-টাইম ডাটা ট্র্যাকিং এবং ওয়ালেট আপডেট
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email));
    onSnapshot(qApp, (snap) => {
        let pending = 0, available = 0, hRows = "", fRows = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Pending';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : (d.status === 'REJECTED' ? '#ff5e5e' : '#ffcc00');

            hRows += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:${statusColor}">${d.status}</span></td><td>${dateStr}</td></tr>`;
            fRows += `<tr><td>${d.studentName}</td><td>${d.contact || 'N/A'}</td><td>${d.passport || 'N/A'}</td><td><b style="color:${statusColor}">${d.status}</b></td><td>${d.compliancePerson || 'Pending'}</td><td><a href="${d.passportUrl || '#'}" target="_blank" style="color:var(--gold)">View Docs</a></td><td>${dateStr}</td></tr>`;
        });

        currentAvailableBalance = available;
        safeSetText('pendingAm', `৳ ${pending.toLocaleString()}`);
        safeSetText('availAm', `৳ ${available.toLocaleString()}`);
        safeSetText('walletDisplay', `৳ ${available.toLocaleString()}`);

        const hBody = document.getElementById('homeLiveBody');
        if(hBody) hBody.innerHTML = hRows || '<tr><td colspan="4">No activity.</td></tr>';
        const fBody = document.getElementById('fullTrackingBody');
        if(fBody) fBody.innerHTML = fRows || '<tr><td colspan="7">No files tracked.</td></tr>';

        // Withdraw Button Control Logic
        const wBtn = document.getElementById('requestWithdrawBtn');
        if(wBtn) {
            if(currentAvailableBalance > 0) {
                wBtn.disabled = false;
                wBtn.style.opacity = "1";
                safeSetText('withdrawNotice', "");
            } else {
                wBtn.disabled = true;
                wBtn.style.opacity = "0.5";
                safeSetText('withdrawNotice', "* Amount is 0. Cannot withdraw.");
            }
        }
    });

    // ২. স্মার্ট সার্চ ফাংশনালিটি
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        searchBtn.onclick = async () => {
            const countryIn = document.getElementById('fCountry').value.trim().toLowerCase();
            const resBody = document.getElementById('searchResultBody');
            document.getElementById('searchResultCard').style.display = 'block';
            resBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching...</td></tr>';

            try {
                const snap = await getDocs(collection(db, "universities"));
                let html = "";
                let found = false;
                snap.forEach(uDoc => {
                    const u = uDoc.data();
                    if ((u.country || "").toLowerCase().includes(countryIn)) {
                        found = true;
                        const commBDT = (parseFloat(u.semesterFee || 0) * (parseFloat(u.partnerComm || 0) / 100)) * 120;
                        html += `<tr>
                            <td style="color:var(--gold); font-weight:bold;">${u.universityName || u.name}</td>
                            <td>${u.country}</td><td>${u.courseName || 'N/A'}</td><td>${u.intake || 'N/A'}</td>
                            <td>${u.minGPA}</td><td>${u.ielts}</td><td>${u.duolingo}</td><td>${u.pte}</td><td>${u.moi}</td>
                            <td style="color:var(--success); font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
                            <td><button class="btn-gold" style="padding:5px 10px; font-size:10px; width:auto;" onclick="openApplyForm('${u.universityName || u.name}')">Apply File</button></td>
                        </tr>`;
                    }
                });
                resBody.innerHTML = found ? html : '<tr><td colspan="11" style="text-align:center;">No match found for this country.</td></tr>';
            } catch (err) { resBody.innerHTML = '<tr><td colspan="11">Error loading data.</td></tr>'; }
        };
    }

    // ৩. উইথড্র রিকোয়েস্ট লজিক
    window.handleWithdraw = async () => {
        if(currentAvailableBalance <= 0) {
            alert("Your balance is 0. Withdrawal not possible.");
            return;
        }

        const amount = parseFloat(prompt("Enter Withdrawal Amount:"));
        if(!amount || amount <= 0) return;
        
        if(amount > currentAvailableBalance) {
            alert("Insufficient Balance! You only have ৳" + currentAvailableBalance);
            return;
        }

        const method = prompt("Payment Method (e.g. Bkash, Nagad, Bank):");
        const account = prompt("Enter Account/Phone Number:");

        if(!method || !account) {
            alert("Payment details are required.");
            return;
        }

        try {
            await addDoc(collection(db, "withdrawals"), {
                partnerEmail: currentUser.email,
                amount: amount,
                method: method,
                account: account,
                status: "PENDING",
                timestamp: serverTimestamp()
            });
            alert("Withdrawal Request Sent! ৳" + amount + " will be processed soon.");
        } catch (e) { alert("Error: " + e.message); }
    };

    const wBtn = document.getElementById('requestWithdrawBtn');
    if(wBtn) wBtn.onclick = handleWithdraw;

    // ৪. ফাইল এপ্লাই এবং স্লিপ লজিক (Glassmorphism Modal)
    window.openApplyForm = (uniName) => {
        document.getElementById('sUniInput').value = uniName;
        document.getElementById('applyModal').style.display = 'flex';
    };

    window.closeModal = () => {
        document.getElementById('applyModal').style.display = 'none';
    };

    document.getElementById('submitApplication').onclick = async () => {
        const sName = document.getElementById('sNameInput').value;
        const sPassportNum = document.getElementById('sPassportInput').value;
        const fPassFile = document.getElementById('fPassport').files[0];

        if(!sName || !sPassportNum || !fPassFile) {
            alert("Required: Student Name, Passport Number, and Passport PDF Copy.");
            return;
        }

        document.getElementById('submitApplication').innerText = "Uploading Documents...";
        document.getElementById('submitApplication').disabled = true;

        try {
            const sRef = ref(storage, `applications/${Date.now()}_${fPassFile.name}`);
            await uploadBytes(sRef, fPassFile);
            const pUrl = await getDownloadURL(sRef);

            const docRef = await addDoc(collection(db, "applications"), {
                studentName: sName,
                passport: sPassportNum,
                university: document.getElementById('sUniInput').value,
                partnerEmail: currentUser.email,
                status: "INCOMING",
                timestamp: serverTimestamp(),
                passportUrl: pUrl,
                pendingAmount: 0,
                finalAmount: 0
            });

            showSlip(docRef.id, sName, document.getElementById('sUniInput').value);
        } catch (e) { 
            alert("Upload Failed: " + e.message); 
            document.getElementById('submitApplication').disabled = false;
            document.getElementById('submitApplication').innerText = "SUBMIT APPLICATION";
        }
    };

    function showSlip(id, name, uni) {
        document.getElementById('applyModal').style.display = 'none';
        document.getElementById('slipModal').style.display = 'flex';
        const appID = "SCC-" + id.substring(0, 6).toUpperCase();
        document.getElementById('slipID').innerText = appID;
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        // QR Code Generator
        document.querySelector('#qrcode img').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=AppID:${appID}-Student:${name}`;
    }

    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}

function safeSetText(id, val) { 
    const el = document.getElementById(id);
    if(el) el.innerText = val; 
}