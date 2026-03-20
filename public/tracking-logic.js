import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

    // Passport search filter
    const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            
            snap.forEach(doc => {
                const d = doc.data();
                
                // Dashboard theke asha exact status text (Capitalized)
                const rawStatus = (d.status || 'PENDING').toUpperCase();

                // --- DYNAMIC STEPPER LOGIC (Status Onujayi Step Green Hobe) ---
                let activeStep = 1; 

                // Mapping strictly based on your Dashboard screenshots:
                if (rawStatus.includes("VERIFIED") || rawStatus.includes("REVIEW")) {
                    activeStep = 2;
                } else if (rawStatus.includes("PAID") || rawStatus.includes("OFFER") || rawStatus.includes("PROCESSING")) {
                    activeStep = 3;
                } else if (rawStatus.includes("SUCCESS") || rawStatus.includes("DONE") || rawStatus.includes("REJECTED")) {
                    activeStep = 4;
                } else {
                    activeStep = 1; // Default Step 1
                }

                // UI Reset & Update
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
                for (let i = 1; i <= activeStep; i++) {
                    const el = document.getElementById(`step-${stepKeys[i-1]}`);
                    if (el) el.classList.add('active');
                }

                // UI Status Display (Ekhane exact status-ta boro kore dekhabe)
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">Applying for:</span> <span class="val">${d.university || 'N/A'}</span></div>
                    
                    <div style="margin-top:20px; text-align:center; padding:15px; background:rgba(46, 204, 113, 0.2); border:2px solid #2ecc71; border-radius:15px;">
                        <div style="font-size:11px; text-transform:uppercase; opacity:0.8; margin-bottom:5px;">Current Live Status</div>
                        <div style="font-size:22px; font-weight:bold; color:#fff; text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);">
                            ${rawStatus.replace('_', ' ')}
                        </div>
                    </div>
                    
                    <div style="margin-top:20px; padding:15px; background:rgba(255,255,255,0.05); border-radius:10px; font-size:13px; border-left:4px solid #f1c40f;">
                        <b style="color:#f1c40f;">💬 Processing Note:</b><br>
                        ${d.complianceNote || "Your file is being processed by the IHP Hub. Status updates will be visible here in real-time."}
                    </div>
                `;
            });
        }
    });
});
