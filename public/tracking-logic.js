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

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = document.getElementById('passportInput').value.trim();
    const resultDiv = document.getElementById('result');
    const dataContent = document.getElementById('data-content');

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    if (unsubscribe) unsubscribe();

    // Latest status query using the new index
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

                // Calculating Time Ago
                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const updateTime = d.createdAt.toDate();
                    const diff = Math.floor((new Date() - updateTime) / 60000); // Minutes
                    timeAgo = diff < 1 ? "Just Now" : `${diff} mins ago`;
                }

                // Dynamic Stepper Logic
                let activeStep = 1; 
                if (rawStatus.includes("VERIFIED") || rawStatus.includes("REVIEW")) activeStep = 2;
                else if (rawStatus.includes("PAID") || rawStatus.includes("OFFER") || rawStatus.includes("APPLIED")) activeStep = 3;
                else if (rawStatus.includes("SUCCESS") || rawStatus.includes("DONE")) activeStep = 4;

                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
                for (let i = 1; i <= activeStep; i++) {
                    const el = document.getElementById(`step-${stepKeys[i-1]}`);
                    if (el) el.classList.add('active');
                }

                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'N/A'}</span></div>
                    
                    <div style="margin-top:20px; text-align:center; padding:15px; background:rgba(46, 204, 113, 0.1); border:1px dashed #2ecc71; border-radius:12px;">
                        <div style="font-size:10px; opacity:0.6; margin-bottom:5px;">CURRENT LIVE STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71;">${rawStatus}</div>
                        <div style="font-size:11px; margin-top:5px; color:#f1c40f;">⏱ Updated: ${timeAgo}</div>
                    </div>
                    
                    <div style="margin-top:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; font-size:12px;">
                        <b style="color:#3498db;">Note:</b> ${d.complianceNote || "Processing started."}
                    </div>
                `;
            });
        }
    });
});
