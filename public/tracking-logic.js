import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let unsubscribe = null;
const passportInput = document.getElementById('passportInput');
const resultDiv = document.getElementById('result');
const dataContent = document.getElementById('data-content');

// --- ✨ AUTO-CLEAR LOGIC ---
passportInput.addEventListener('input', () => {
    if (passportInput.value.trim() === "") {
        if (unsubscribe) unsubscribe();
        resultDiv.style.display = "none";
        dataContent.innerHTML = "";
    }
});

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = passportInput.value.trim();
    if (!inputVal) { alert("Please enter a Passport Number!"); return; }

    if (unsubscribe) unsubscribe();

    // Composite Index Query
    const q = query(
        collection(db, "applications"), 
        where("passportNo", "==", inputVal),
        orderBy("createdAt", "desc"),
        limit(1)
    );
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'PENDING').toUpperCase();

                // --- ⏱ TIME AGO LOGIC ---
                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const diffMins = Math.floor((new Date() - d.createdAt.toDate()) / 60000);
                    timeAgo = diffMins < 1 ? "Just Now" : `${diffMins} mins ago`;
                }

                // --- 📅 ESTIMATED TIME LOGIC ---
                let estimateText = "Processing your file.";
                if (rawStatus.includes("PENDING")) estimateText = "Screening: Update in 24-48 hours.";
                else if (rawStatus.includes("APPLIED")) estimateText = "University review: 7-14 working days.";
                else if (rawStatus.includes("OFFER")) estimateText = "CAS/Payment: 5-7 working days.";
                else if (rawStatus.includes("VISA")) estimateText = "Embassy result: 15-21 days.";

                dataContent.innerHTML = `
                    <div class="info-row"><span>Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span>Passport:</span> <span class="val">${d.passportNo}</span></div>
                    
                    <div style="margin:15px 0; padding:15px; background:rgba(46, 204, 113, 0.1); border:1px solid #2ecc71; border-radius:12px;">
                        <div style="font-size:10px; opacity:0.7;">CURRENT STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71; margin:5px 0;">${rawStatus}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.6);">⏱ ${timeAgo}</div>
                    </div>

                    <div style="padding:12px; background:rgba(241, 196, 15, 0.1); border-left:4px solid #f1c40f; border-radius:4px; text-align:left;">
                        <div style="font-size:11px; font-weight:bold; color:#f1c40f;">📅 EXPECTED UPDATE</div>
                        <div style="font-size:13px;">${estimateText}</div>
                    </div>
                `;
            });
        }
    });
});
