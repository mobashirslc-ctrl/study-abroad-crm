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

    // --- FIX: Sorting by createdAt to get the LATEST update first ---
    const q = query(
        collection(db, "applications"), 
        where("passportNo", "==", inputVal),
        orderBy("createdAt", "desc"),
        limit(1) // Sudhu shobcheye notun file-ta nibe
    );
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found for this Passport.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            
            // Prothom (Latest) document-ta pick korbe
            const doc = snap.docs[0]; 
            const d = doc.data();
            
            // Dashboard dropdown-er exact text
            const rawStatus = (d.status || 'PENDING').toUpperCase();

            // --- 🚀 MAPPING LOGIC (Based on keywords) ---
            let activeStep = 1; 
            if (rawStatus.includes("VERIFIED") || rawStatus.includes("REVIEW")) activeStep = 2;
            else if (rawStatus.includes("PAID") || rawStatus.includes("OFFER") || rawStatus.includes("APPLIED")) activeStep = 3;
            else if (rawStatus.includes("SUCCESS") || rawStatus.includes("DONE")) activeStep = 4;
            else if (rawStatus.includes("REJECTED")) activeStep = 0; // Negative case

            // UI Update
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
            for (let i = 1; i <= activeStep; i++) {
                const el = document.getElementById(`step-${stepKeys[i-1]}`);
                if (el) el.classList.add('active');
            }

            // Display EXACT status text from Dashboard
            dataContent.innerHTML = `
                <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'N/A'}</span></div>
                
                <div style="margin-top:20px; text-align:center; padding:15px; background:rgba(46, 204, 113, 0.15); border:2px solid #2ecc71; border-radius:15px;">
                    <div style="font-size:10px; text-transform:uppercase; opacity:0.7; margin-bottom:5px; color:#fff;">Live Application Status</div>
                    <div style="font-size:18px; font-weight:bold; color:#2ecc71;">
                        ${rawStatus}
                    </div>
                </div>
                
                <div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.05); border-radius:10px; font-size:13px; border-left:4px solid #f1c40f;">
                    <b style="color:#f1c40f;">💬 Counselor Note:</b><br>
                    ${d.complianceNote || "File is under processing at IHP Hub."}
                </div>
            `;
        }
    }, (error) => {
        console.error("Tracking Error:", error);
        if(error.code === 'failed-precondition') {
            alert("Firebase indexing is required. Please check console link.");
        }
    });
});
