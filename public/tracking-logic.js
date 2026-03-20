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

// Auto-Clear logic when input is removed
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

    const q = query(
        collection(db, "applications"), 
        where("passportNo", "==", inputVal),
        orderBy("createdAt", "desc"), // Needs the index from 1083.jpg
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

                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const diffMins = Math.floor((new Date() - d.createdAt.toDate()) / 60000);
                    timeAgo = diffMins < 1 ? "Just Now" : `${diffMins} mins ago`;
                }

                let estimateText = "Processing your file.";
                if (rawStatus.includes("PENDING")) estimateText = "Screening: Update in 24-48 hours.";
                else if (rawStatus.includes("APPLIED")) estimateText = "University review: 7-14 working days.";
                else if (rawStatus.includes("VISA")) estimateText = "Embassy result: 15-21 days.";

                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="status-box">
                        <div style="font-size:10px; opacity:0.7;">CURRENT STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71;">${rawStatus}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.6);">⏱ ${timeAgo}</div>
                    </div>
                    <div class="estimate-box">
                        <div style="font-size:11px; font-weight:bold; color:#f1c40f;">📅 EXPECTED UPDATE</div>
                        <div style="font-size:13px;">${estimateText}</div>
                    </div>
                `;
            });
        }
    });
});
