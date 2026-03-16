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
    const updatePartnerHeader = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if(userDoc.exists()) {
                const userData = userDoc.data();
                safeSetText('welcomePartner', `Welcome, ${userData.fullName || 'Partner'}`);
            }
        } catch (e) { console.error(e); }
    };
    updatePartnerHeader();

    // ১. রিয়েল-টাইম ডাটা লিসেনার (Status & Tracking)
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email), orderBy("timestamp", "desc"));
    onSnapshot(qApp, (snap) => {
        let pending = 0, available = 0, homeRows = "", fullRows = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : '#ffcc00';

            homeRows += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:${statusColor}">${d.status}</span></td><td>${dateStr}</td></tr>`;
            fullRows += `<tr><td>${d.studentName}</td><td>${d.contact || 'N/A'}</td><td>${d.passport || 'N/A'}</td><td><b style="color:${statusColor}">${d.status}</b></td><td>${d.compliancePerson || 'Pending'}</td><td><a href="${d.docLink || '#'}" target="_blank" style="color:var(--gold)">View Docs</a></td><td>${dateStr}</td></tr>`;
        });
        
        safeSetText('pendingAm', `৳ ${pending.toLocaleString()}`);
        safeSetText('availAm', `৳ ${available.toLocaleString()}`);
        safeSetText('walletDisplay', `৳ ${available.toLocaleString()}`);
        
        const hBody = document.getElementById('homeLiveBody');
        if(hBody) hBody.innerHTML = homeRows || '<tr><td colspan="4">No activity.</td></tr>';
        const fBody = document.getElementById('fullTrackingBody');
        if(fBody) fBody.innerHTML = fullRows || '<tr><td colspan="7">No files tracked.</td></tr>';
    });

    // ২. স্মার্ট অ্যাসেসমেন্ট ও কমিশন ক্যালকুলেশন
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const country = document.getElementById('fCountry').value.trim().toUpperCase();
            const gpa = parseFloat(document.getElementById('fAcad').value) || 0;
            const resCard = document.getElementById('searchResultCard');
            const resBody = document.getElementById('searchResultBody');

            if(!country) { alert("Enter Country!"); return; }

            resCard.style.display = 'block';
            resBody.innerHTML = '<tr><td colspan="11">Searching...</td></tr>';

            try {
                // এক্সচেঞ্জ রেট (অ্যাডমিন থেকে আসতে পারে, এখানে ম্যানুয়াল ১ GBP = ১৫০ BDT)
                const rate = 150; 
                const qUni = query(collection(db, "universities"), where("country", "==", country));
                const snap = await getDocs(qUni);
                
                let html = "";
                snap.forEach(uDoc => {
                    const u = uDoc.data();
                    // কমিশন লজিক: (GBP * Rate) * (Partner % / 100)
                    const commissionBDT = (parseFloat(u.commissionGBP || 0) * rate) * (parseFloat(u.partnerShare || 50) / 100);

                    if (gpa >= parseFloat(u.minGPA || 0)) {
                        html += `
                            <tr>
                                <td style="color:var(--gold)">${u.name}</td>
                                <td>${u.country}</td>
                                <td>${u.course || 'All'}</td>
                                <td>${u.intake || 'N/A'}</td>
                                <td>${u.minGPA}</td>
                                <td>${u.ielts || 'N/A'}</td>
                                <td>${u.duolingo || 'N/A'}</td>
                                <td>${u.pte || 'N/A'}</td>
                                <td>${u.moi || 'No'}</td>
                                <td style="color:var(--success); font-weight:bold;">৳ ${commissionBDT.toLocaleString()}</td>
                                <td><button class="btn-gold" style="padding:5px; font-size:10px;" onclick="initApply('${uDoc.id}', '${u.name}')">Apply File</button></td>
                            </tr>`;
                    }
                });
                resBody.innerHTML = html || '<tr><td colspan="11">No Match Found.</td></tr>';
            } catch (e) { console.error(e); }
        });
    }

    // ৩. ফাইল সাবমিশন লজিক (File Open Button Action)
    window.initApply = async (uniId, uniName) => {
        const sName = prompt("Enter Student Full Name:");
        const sPhone = prompt("Enter Student Phone:");
        if(!sName || !sPhone) return;

        alert("Please prepare 3 PDF files (Passport, Academic, IELTS). Sending request...");

        // এখানে আমরা একটি অবজেক্ট তৈরি করছি যা সরাসরি কমপ্লায়েন্স সেকশনে যাবে
        try {
            const docRef = await addDoc(collection(db, "applications"), {
                studentName: sName,
                contact: sPhone,
                university: uniName,
                partnerEmail: currentUser.email,
                status: "INCOMING", // সরাসরি Compliance Incoming-এ দেখাবে
                timestamp: serverTimestamp(),
                pendingAmount: 0 // অ্যাডমিন ভেরিফাই করলে এখানে টাকা যোগ হবে
            });

            alert(`Success! Acknowledgement ID: SCC-${docRef.id.substring(0,6).toUpperCase()}\nStatus: Live Tracking Active.`);
            showSection('tracking'); // সরাসরি ট্র্যাকিং পেজে নিয়ে যাবে
        } catch (e) { alert(e.message); }
    };

    // ৪. প্রোফাইল ও লগআউট
    document.getElementById('updateProfileBtn').onclick = async () => {
        await updateDoc(doc(db, "users", currentUser.uid), {
            fullName: document.getElementById('pName').value,
            orgName: document.getElementById('pOrg').value,
            phone: document.getElementById('pPhone').value
        });
        alert("Profile Updated!");
    };

    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}

function safeSetText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}