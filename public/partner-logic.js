import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- ১. ফায়ারবেস সেটআপ ---
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

// প্রোটেকশন
if (!userEmail) { window.location.href = 'index.html'; }

// --- ২. ইউজার প্রোফাইল লোড (বড় লজিক) ---
async function fetchPartnerInfo() {
    const userRef = collection(db, "users");
    onSnapshot(userRef, (snapshot) => {
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.email && userData.email.toLowerCase() === userEmail.toLowerCase()) {
                const nameDisplay = document.getElementById('partnerNameDisplay');
                if (nameDisplay) nameDisplay.innerText = userData.fullName || "Partner";
            }
        });
    });
}
fetchPartnerInfo();

// --- ৩. ওয়ালেট এবং অ্যাপ্লিকেশন ট্র্যাকিং (Full Logic) ---
function syncPartnerDashboard() {
    const appRef = collection(db, "applications");
    // আমরা জাভাস্ক্রিপ্ট দিয়ে সর্ট করছি যাতে ইনডেক্সিং এরর না হয়
    const q = query(appRef, where("partnerEmail", "==", userEmail.toLowerCase()));

    onSnapshot(q, (snapshot) => {
        let pendingAmount = 0;
        let finalAmount = 0;
        let tableRows = "";

        // ডাটা সর্টিং (নতুনগুলো উপরে)
        const allApps = [];
        snapshot.forEach(doc => allApps.push({ id: doc.id, ...doc.data() }));
        allApps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        allApps.forEach((data) => {
            const commissionValue = Number(data.commission) || 0;

            // ওয়ালেট ক্যালকুলেশন লজিক
            if (data.commissionStatus === 'pending') {
                pendingAmount += commissionValue;
            } else if (data.commissionStatus === 'ready') {
                finalAmount += commissionValue;
            }

            // ডেট ফরম্যাটিং
            let formattedDate = "N/A";
            if (data.createdAt && data.createdAt.toDate) {
                const d = data.createdAt.toDate();
                formattedDate = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
            }

            // ৪টি ফাইল ভিউ আইকন লজিক
            const docIcons = `
                <div style="display:flex; gap:10px; justify-content:center; align-items:center;">
                    ${data.docs?.academic ? `<a href="${data.docs.academic}" target="_blank" title="Academic"><i class="fas fa-file-pdf" style="color:#00d2ff; font-size:16px;"></i></a>` : ''}
                    ${data.docs?.passport ? `<a href="${data.docs.passport}" target="_blank" title="Passport"><i class="fas fa-file-invoice" style="color:#00d2ff; font-size:16px;"></i></a>` : ''}
                    ${data.docs?.language ? `<a href="${data.docs.language}" target="_blank" title="Language"><i class="fas fa-certificate" style="color:#00d2ff; font-size:16px;"></i></a>` : ''}
                    ${data.docs?.others ? `<a href="${data.docs.others}" target="_blank" title="Others"><i class="fas fa-folder-plus" style="color:#00d2ff; font-size:16px;"></i></a>` : ''}
                </div>
            `;

            // টেবিল রো জেনারেশন
            tableRows += `
                <tr>
                    <td>
                        <div style="font-weight:600; color:#fff;">${data.studentName}</div>
                        <div style="font-size:11px; color:#888;">${data.university || 'Not Selected'}</div>
                    </td>
                    <td style="color:#eee;">${data.passportNo || 'N/A'}</td>
                    <td>
                        <span class="status-pill ${data.status || 'pending'}">
                            ${(data.status || 'SUBMITTED').toUpperCase()}
                        </span>
                    </td>
                    <td>${docIcons}</td>
                    <td style="color:#aaa; font-size:12px;">${formattedDate}</td>
                </tr>
            `;
        });

        // UI আপডেট করা
        const pWallet = document.getElementById('topPending');
        const fWallet = document.getElementById('topFinal');
        const trackBody = document.getElementById('homeTrackingBody');
        const loader = document.getElementById('loader');

        if (pWallet) pWallet.innerText = "৳" + pendingAmount.toLocaleString();
        if (fWallet) fWallet.innerText = "৳" + finalAmount.toLocaleString();
        if (trackBody) trackBody.innerHTML = tableRows || "<tr><td colspan='5' align='center' style='padding:30px; color:#666;'>No applications found in your account.</td></tr>";
        if (loader) loader.style.display = 'none';
    });
}
syncPartnerDashboard();

// --- ৪. লগআউট সিস্টেম ---
const logoutAction = document.getElementById('logoutBtn');
if (logoutAction) {
    logoutAction.addEventListener('click', () => {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
}
