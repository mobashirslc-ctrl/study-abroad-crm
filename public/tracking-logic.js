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

                // --- ⏱ TIME DURATION & ESTIMATE LOGIC ---
                let estimateText = "Processing your documents...";
                let duration = "2-3 Days";

                if (rawStatus.includes("PENDING")) {
                    estimateText = "Initial screening and document verification.";
                    duration = "24-48 Hours";
                } else if (rawStatus.includes("APPLIED") || rawStatus.includes("OFFER")) {
                    estimateText = "University is reviewing your application.";
                    duration = "7-14 Working Days";
                } else if (rawStatus.includes("VISA") || rawStatus.includes("EMBASSY")) {
                    estimateText = "Visa file is under embassy processing.";
                    duration = "15-21 Days";
                }

                // --- 🖥️ UI RENDERING (LARGE & PURPLE) ---
                dataContent.innerHTML = `
                    <div style="text-align: left;">
                        <div class="info-row"><span class="label">STUDENT</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">PASSPORT</span> <span class="val">${d.passportNo || 'N/A'}</span></div>
                    </div>

                    <div style="margin-top: 15px; padding: 15px; background: rgba(162, 155, 254, 0.05); border-radius: 15px; border: 1px dashed rgba(162, 155, 254, 0.3);">
                        <div style="font-size: 10px; color: #a29bfe; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">OFFICIAL PARTNER</div>
                        <div style="font-size: 14px; font-weight: bold; color: #fff;">${d.partnerName || 'Authorized SSC Partner'}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;">📞 ${d.partnerPhone || 'Contact Agency'}</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">📍 ${d.partnerAddress || 'Bangladesh Office'}</div>
                    </div>
                    
                    <div style="margin-top:20px; text-align:center; padding:20px; background:rgba(46, 204, 113, 0.1); border:1px solid #2ecc71; border-radius:20px;">
                        <div style="font-size:11px; color:#2ecc71; font-weight:bold; letter-spacing:2px;">LIVE STATUS</div>
                        <div style="font-size:24px; font-weight:900; color:#2ecc71; margin-top:5px;">${rawStatus}</div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <div style="flex: 1; padding: 12px; background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; border-radius: 12px; text-align: center;">
                            <div style="font-size: 9px; color: #3498db; font-weight: bold;">TIME PERIOD</div>
                            <div style="font-size: 13px; font-weight: bold; color: #fff; margin-top: 4px;">${duration}</div>
                        </div>
                        <div style="flex: 1.5; padding: 12px; background: rgba(241, 196, 15, 0.1); border: 1px solid #f1c40f; border-radius: 12px;">
                            <div style="font-size: 9px; color: #f1c40f; font-weight: bold;">NEXT STEP IDEA</div>
                            <div style="font-size: 11px; color: #fff; margin-top: 4px;">${estimateText}</div>
                        </div>
                    </div>
                `;
            });
        }
    });
});
