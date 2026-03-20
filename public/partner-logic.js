import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk", 
    authDomain: "ihp-portal-v3.firebaseapp.com", 
    projectId: "ihp-portal-v3", 
    storageBucket: "ihp-portal-v3.firebasestorage.app", 
    messagingSenderId: "481157902534", 
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('userEmail');

if (!userEmail) { window.location.href = 'index.html'; }

// --- ২. ওয়ালেট লজিক (আপনার ৩টি শর্ত অনুযায়ী) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let allDocs = [];

        snap.forEach(dSnap => {
            const d = dSnap.data();
            allDocs.push(d);
            const comm = Number(d.commission || 0);
            const status = d.status ? d.status.toLowerCase() : '';

            // শর্ত ৩: যদি ভিসা রিজেক্ট হয়, তবে কোনো বক্সেই যোগ হবে না
            if (status === 'visa rejected') return;

            // শর্ত ১ ও ২: স্ট্যাটাস অনুযায়ী বক্স মুভমেন্ট
            if (status === 'student paid to uni') {
                final += comm; // পেন্ডিং থেকে মাইনাস হয়ে ফাইনালে আসবে
            } else if (status === 'verified') {
                pending += comm; // শুধুমাত্র ভেরিফাইড হলে পেন্ডিং বক্সে দেখাবে
            }
        });

        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        allDocs.forEach(d => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- ৩. সার্চ ও এপ্লাই ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    // ... filtering logic ...
    // নিশ্চিত করুন বাটন কোডটি এরকম: 
    // <button onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button>
};

// --- ৪. সাবমিট অ্যাপ্লিকেশন ---
document.getElementById('submitAppBtn').onclick = async () => {
    const slipWin = window.open('', '_blank');
    // ... file upload logic ...
    const appData = {
        studentName: document.getElementById('appSName').value,
        passportNo: document.getElementById('appSPass').value,
        university: window.selectedUni.name,
        commission: Number(window.selectedUni.comm),
        partnerEmail: userEmail.toLowerCase(),
        status: 'submitted', // শুরুতে ০ ব্যালেন্স
        createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "applications"), appData);
    // ... slip generation & alert ...
};

// প্রোফাইল নেম
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner';
});
