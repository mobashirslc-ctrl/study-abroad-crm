import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- ⚙️ FIREBASE CONFIGURATION ---
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

// --- ✨ AUTO-REFRESH/CLEAR LOGIC ---
// Input box khali korle result auto muche jabe
passportInput.addEventListener('input', () => {
    if (passportInput.value.trim() === "") {
        if (unsubscribe) unsubscribe(); // Firebase listener bondho korbe
        resultDiv.style.display = "none"; // UI theke result hide korbe
        dataContent.innerHTML = ""; // Purono data muche fela hobe
    }
});

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = passportInput.value.trim();

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    if (unsubscribe) unsubscribe();

    // --- 🚀 QUERY WITH COMPOSITE INDEX ---
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

                // --- ⏱ LAST UPDATED LOGIC ---
                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const updateTime = d.createdAt.toDate();
                    const diffMs = new Date() - updateTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins >= 1) timeAgo = `${diffMins} mins ago`;
                }

                // --- 📅 ESTIMATED NEXT STEP ---
                let estimateText = "Our team is processing your file.";
                if (rawStatus.includes("PENDING")) estimateText = "Initial screening: Expect update in 24-48 hours.";
                else if (rawStatus.includes("APPLIED")) estimateText = "University review: Offer letter takes 7-14 working days.";
                else if (rawStatus.includes("VISA")) estimateText = "Embassy processing: Results usually in 15-21 days.";

                // --- 🟢 STEPPER LOGIC ---
                let activeStep = 1; 
                if (rawStatus.includes("VERIFIED")) activeStep = 2;
                else if (rawStatus.includes("PAID") || rawStatus.includes("OFFER")) activeStep = 3;
                else if (rawStatus.includes("SUCCESS")) activeStep = 4;

                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
                for (let i = 1; i <= activeStep; i++) {
                    const el = document.getElementById(`step-${stepKeys[i-1]}`);
                    if (el) el.classList.add('active');
                }

                // --- 🖥️ UI RENDERING ---
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    
                    <div style="margin-top:20px; text-align:center; padding:15px; background:rgba(46, 204, 113, 0.1); border:1px solid #2ecc71; border-radius:12px;">
                        <div style="font-size:10px; opacity:0.6; margin-bottom:5px; color:#fff;">LIVE STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71;">${rawStatus}</div>
                        <div style="font-size:11px; margin-top:5px; color:rgba(255,255,255,0.7);">⏱ Updated: ${timeAgo}</div>
                    </div>

                    <div style="margin-top:15px; padding:12px; background:rgba(241, 196, 15, 0.1); border-left:4px solid #f1c40f; border-radius:4px;">
                        <div style="font-size:11px; font-weight:bold; color:#f1c40f; margin-bottom:3px;">📅 ESTIMATED NEXT STEP</div>
                        <div style="font-size:13px; color:#fff;">${estimateText}</div>
                    </div>
                `;
            });
        }
    });
});
