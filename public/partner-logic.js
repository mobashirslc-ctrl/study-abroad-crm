import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- ১. ফায়ারবেস কনফিগারেশন (ihp-portal-v3) ---
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

// সেশন থেকে পার্টনারের ইমেইল নেওয়া
const userEmail = localStorage.getItem('userEmail');

if (!userEmail) {
    window.location.href = 'index.html'; // লগইন না থাকলে রিডাইরেক্ট
}

// --- ২. রিয়েল-টাইম ওয়ালেট এবং অ্যাপ্লিকেশন ট্র্যাকিং (The Core Engine) ---
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
        const commission = Number(d.commission) || 0;
        const status = d.status || "submitted";
        const cStatus = d.commissionStatus || "waiting";

        // --- ওয়ালেট ক্যালকুলেশন লজিক (Compliance এর সাথে সিঙ্কড) ---
        if (cStatus === 'pending') {
            pendingWallet += commission; // Verified ফাইল এখানে যোগ হবে
        } else if (cStatus === 'ready') {
            finalWallet += commission;   // Student Paid/Visa Success হলে এখানে আসবে
        }

        // --- অ্যাপ্লিকেশন লিস্ট জেনারেশন ---
        const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : 'Processing...';
        
        tableHtml += `
            <tr>
                <td>
                    <div style="font-weight: bold; color: #fff;">${d.studentName}</div>
                    <small style="color: #888;">${d.university || 'N/A'}</small>
                </td>
                <td>${d.passportNo || 'N/A'}</td>
                <td>
                    <span class="status-pill ${status.toLowerCase()}">
                        ${status.toUpperCase()}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${d.docs?.academic ? `<i class="fas fa-file-pdf" title="Academic Docs" style="color: #00d2ff;"></i>` : ''}
                        ${d.docs?.passport ? `<i class="fas fa-file-contract" title="Passport" style="color: #00d2ff;"></i>` : ''}
                    </div>
                </td>
                <td><small style="color: #aaa;">${date}</small></td>
            </tr>
        `;
    });

    // --- UI আপডেট ---
    // ওয়ালেট সেকশন
    const pendingEl = document.getElementById('topPending');
    const finalEl = document.getElementById('topFinal');
    if (pendingEl) pendingEl.innerText = `৳${pendingWallet.toLocaleString()}`;
    if (finalEl) finalEl.innerText = `৳${finalWallet.toLocaleString()}`;

    // টেবিল সেকশন
    const tbody = document.getElementById('homeTrackingBody');
    if (tbody) {
        tbody.innerHTML = tableHtml || `<tr><td colspan="5" align="center" style="padding: 20px; color: #888;">No applications submitted yet.</td></tr>`;
    }

    // লোডার লুকানো
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
});

// --- ৩. পার্টনার প্রোফাইল ইনফো ---
async function loadPartnerProfile() {
    const profileName = document.getElementById('partnerNameDisplay');
    if (!profileName) return;

    onSnapshot(collection(db, "users"), (snap) => {
        snap.forEach(uDoc => {
            const u = uDoc.data();
            if (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) {
                profileName.innerText = u.fullName || "Partner";
            }
        });
    });
}
loadPartnerProfile();

// --- ৪. লগআউট ফাংশন ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        window.location.href = 'index.html';
    };
}
