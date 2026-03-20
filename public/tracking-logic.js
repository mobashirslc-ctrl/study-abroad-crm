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

    const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'PENDING').toUpperCase();

                // --- 🚀 COMPLIANCE MATCHING LOGIC ---
                let activeStep = 1; 

                // Step 1: SUBMITTED (Default for PENDING or SUBMITTED)
                if (rawStatus === 'PENDING' || rawStatus === 'SUBMITTED') {
                    activeStep = 1;
                }

                // Step 2: COMPLIANCE (Jokhon staff VERIFIED kore)
                if (rawStatus.includes("VERIFIED") || rawStatus.includes("REVIEWING")) {
                    activeStep = 2;
                }
                
                // Step 3: PROCESSING (Jokhon Student Pay kore ba processing-e thake)
                if (rawStatus.includes("STUDENT_PAID") || rawStatus.includes("PROCESSING") || rawStatus.includes("OFFER_DONE")) {
                    activeStep = 3;
                }

                // Step 4: OUTCOME (Visa status or final outcome)
                if (rawStatus.includes("VISA_SUCCESS") || rawStatus.includes("DONE") || rawStatus.includes("VISA_REJECTED")) {
                    activeStep = 4;
                }

                // --- UI UPDATES ---
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
                for (let i = 1; i <= activeStep; i++) {
                    const el = document.getElementById(`step-${stepKeys[i-1]}`);
                    if (el) el.classList.add('active');
                }

                // Display exact text from Compliance Dashboard
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'Processing...'}</span></div>
                    <div class="info-row" style="margin-top:10px;">
                        <span class="label">System Status:</span> 
                        <span class="val" style="background:#2ecc71; color:#fff; padding:4px 12px; border-radius:6px; font-weight:bold; font-size:13px; display:inline-block;">
                            ${rawStatus.replace('_', ' ')}
                        </span>
                    </div>
                    
                    <div style="margin-top:15px; padding:15px; background:rgba(255,255,255,0.05); border-radius:10px; font-size:13px; border-left:4px solid #f1c40f; color:#ecf0f1;">
                        <b style="color:#f1c40f;">💬 IHP Official Note:</b><br>
                        ${d.complianceNote || "Our team is working on your file. Updates will be visible here in real-time."}
                    </div>
                `;
            });
        }
    });
});
