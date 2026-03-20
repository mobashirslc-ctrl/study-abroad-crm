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

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = document.getElementById('passportInput').value.trim();
    const resultDiv = document.getElementById('result');
    const dataContent = document.getElementById('data-content');

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    // Purono listener thakle bondho kore notun search shuru korbe
    if (unsubscribe) unsubscribe();

    // --- 🚀 QUERY WITH COMPOSITE INDEX ---
    // Eta shob shomoy latest row-ta pick korbe (A690234 er moto multiple entry thakleo)
    const q = query(
        collection(db, "applications"), 
        where("passportNo", "==", inputVal),
        orderBy("createdAt", "desc"),
        limit(1)
    );
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found. Please check the Passport Number.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'PENDING').toUpperCase();

                // --- ⏱ REAL-TIME "LAST UPDATED" LOGIC ---
                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const updateTime = d.createdAt.toDate();
                    const now = new Date();
                    const diffMs = now - updateTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) timeAgo = "Just Now";
                    else if (diffMins < 60) timeAgo = `${diffMins} mins ago`;
                    else if (diffHours < 24) timeAgo = `${diffHours} hours ago`;
                    else timeAgo = `${diffDays} days ago`;
                }

                // --- 📅 ESTIMATED NEXT STEP LOGIC (Based on Dashboard Status) ---
                let estimateText = "";
                if (rawStatus.includes("PENDING")) {
                    estimateText = "Initial screening: Expect update in 24-48 hours.";
                } else if (rawStatus.includes("VERIFIED")) {
                    estimateText = "Compliance checked. Application submission in 1-2 days.";
                } else if (rawStatus.includes("APPLIED")) {
                    estimateText = "University review: Offer letter takes 7-14 working days.";
                } else if (rawStatus.includes("OFFER")) {
                    estimateText = "Offer received! Payment & CAS process takes 5-7 days.";
                } else if (rawStatus.includes("VISA")) {
                    estimateText = "Embassy processing: Results usually in 15-21 days.";
                } else if (rawStatus.includes("MISSING")) {
                    estimateText = "Please contact your agency to submit missing documents.";
                } else {
                    estimateText = "Our team is working on your file. Stay tuned for updates.";
                }

                // --- 🟢 DYNAMIC STEPPER UPDATE ---
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

                // --- 🖥️ UI RENDERING ---
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'N/A'}</span></div>
                    
                    <div style="margin-top:20px; text-align:center; padding:15px; background:rgba(46, 204, 113, 0.1); border:1px solid #2ecc71; border-radius:12px;">
                        <div style="font-size:10px; opacity:0.6; margin-bottom:5px; color:#fff; letter-spacing:1px;">LIVE STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71; text-transform:uppercase;">${rawStatus}</div>
                        <div style="font-size:11px; margin-top:5px; color:rgba(255,255,255,0.7);">⏱ Updated: ${timeAgo}</div>
                    </div>

                    <div style="margin-top:15px; padding:12px; background:rgba(241, 196, 15, 0.1); border-left:4px solid #f1c40f; border-radius:4px;">
                        <div style="font-size:11px; font-weight:bold; color:#f1c40f; margin-bottom:3px; text-transform:uppercase;">📅 Estimated Next Step</div>
                        <div style="font-size:13px; color:#fff; line-height:1.4;">${estimateText}</div>
                    </div>
                    
                    <div style="margin-top:15px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; font-size:12px; line-height:1.5;">
                        <b style="color:#3498db;">Counselor's Note:</b><br>
                        ${d.complianceNote || "Your application is being processed at our central processing hub."}
                    </div>
                `;
            });
        }
    }, (error) => {
        console.error("Index Error:", error);
        alert("System is updating. Please try again in 2 minutes.");
    });
});
