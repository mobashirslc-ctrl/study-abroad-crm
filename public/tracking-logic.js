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
passportInput.addEventListener('input', () => {
    if (passportInput.value.trim() === "") {
        if (unsubscribe) unsubscribe(); 
        resultDiv.style.display = "none"; 
        dataContent.innerHTML = ""; 
    }
});

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = passportInput.value.trim();

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    if (unsubscribe) unsubscribe();

    // --- 🚀 REALTIME QUERY ---
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
                    if (diffMins >= 60) timeAgo = `${Math.floor(diffMins/60)} hours ago`;
                }

                // --- 📅 ESTIMATED NEXT STEP ---
                let estimateText = "Our team is processing your file.";
                if (rawStatus.includes("PENDING")) estimateText = "Initial screening: Expect update in 24-48 hours.";
                else if (rawStatus.includes("APPLIED")) estimateText = "University review: Offer letter takes 7-14 working days.";
                else if (rawStatus.includes("VISA")) estimateText = "Embassy processing: Results usually in 15-21 days.";

                // --- 🖥️ UI RENDERING (LARGE & PURPLE THEME) ---
                dataContent.innerHTML = `
                    <div style="text-align: left; margin-top: 10px;">
                        <div class="info-row">
                            <span class="label">STUDENT NAME</span>
                            <span class="val">${d.studentName || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">PASSPORT NO</span>
                            <span class="val">${d.passportNo || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top:25px; text-align:center; padding:20px; background:rgba(162, 155, 254, 0.1); border:1px solid rgba(162, 155, 254, 0.4); border-radius:18px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">
                        <div style="font-size:11px; opacity:0.7; letter-spacing:2px; color:#a29bfe; margin-bottom:8px; font-weight:bold;">CURRENT STATUS</div>
                        <div style="font-size:24px; font-weight:900; color:#2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.3);">${rawStatus}</div>
                        <div style="font-size:12px; margin-top:10px; color:rgba(255,255,255,0.6);">⏱ Last Sync: ${timeAgo}</div>
                    </div>

                    <div style="margin-top:20px; padding:18px; background:rgba(241, 196, 15, 0.05); border-left:5px solid #f1c40f; border-radius:12px; text-align: left;">
                        <div style="font-size:12px; font-weight:bold; color:#f1c40f; margin-bottom:5px; letter-spacing:1px;">📅 WHAT'S NEXT?</div>
                        <div style="font-size:14px; color:rgba(255,255,255,0.9); line-height:1.5;">${estimateText}</div>
                    </div>
                `;
            });
        }
    });
});
