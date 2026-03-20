import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

if (!userEmail) {
    window.location.href = 'index.html';
}

// --- ১. ওয়ালেট ও অ্যাপ্লিকেশন লিস্ট (Realtime) ---
const q = query(
    collection(db, "applications"), 
    where("partnerEmail", "==", userEmail.toLowerCase()),
    orderBy("createdAt", "desc")
);

onSnapshot(q, (snap) => {
    let pendingWallet = 0;
    let finalWallet = 0;
    let tableHtml = "";

    snap.forEach((docSnap) => {
        const d = docSnap.data();
        const comm = Number(d.commission) || 0;
        
        // ওয়ালেট লজিক
        if (d.commissionStatus === 'pending') pendingWallet += comm;
        if (d.commissionStatus === 'ready') finalWallet += comm;

        // ডেট ফরম্যাট
        const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
        
        // টেবিল রো (আপনার অরিজিনাল ডিজাইনের সাথে মিল রেখে)
        tableHtml += `
            <tr>
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.university || 'N/A'}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'SUBMITTED').toUpperCase()}</span></td>
                <td>
                    <div style="display:flex; gap:8px; justify-content:center;">
                        ${d.docs?.academic ? `<a href="${d.docs.academic}" target="_blank" title="Academic"><i class="fas fa-file-pdf" style="color:#00d2ff;"></i></a>` : ''}
                        ${d.docs?.passport ? `<a href="${d.docs.passport}" target="_blank" title="Passport"><i class="fas fa-file-invoice" style="color:#00d2ff;"></i></a>` : ''}
                        ${d.docs?.language ? `<a href="${d.docs.language}" target="_blank" title="Language"><i class="fas fa-certificate" style="color:#00d2ff;"></i></a>` : ''}
                        ${d.docs?.others ? `<a href="${d.docs.others}" target="_blank" title="Others"><i class="fas fa-folder-plus" style="color:#00d2ff;"></i></a>` : ''}
                    </div>
                </td>
                <td>${date}</td>
            </tr>
        `;
    });

    // UI আপডেট (ID গুলো আপনার HTML এর সাথে মিলিয়ে নিবেন)
    const pEl = document.getElementById('topPending');
    const fEl = document.getElementById('topFinal');
    const tbody = document.getElementById('homeTrackingBody');

    if (pEl) pEl.innerText = `৳${pendingWallet.toLocaleString()}`;
    if (fEl) fEl.innerText = `৳${finalWallet.toLocaleString()}`;
    if (tbody) tbody.innerHTML = tableHtml || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";

    // লোডার অফ করা
    if (document.getElementById('loader')) {
        document.getElementById('loader').style.display = 'none';
    }
});

// --- ২. নাম ও প্রোফাইল ডিসপ্লে ---
onSnapshot(collection(db, "users"), (snap) => {
    snap.forEach(uDoc => {
        const u = uDoc.data();
        if (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) {
            const display = document.getElementById('partnerNameDisplay');
            if (display) display.innerText = u.fullName || "Partner";
        }
    });
});

// --- ৩. লগআউট ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        window.location.href = 'index.html';
    };
}
