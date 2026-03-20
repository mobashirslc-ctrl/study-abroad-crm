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

let unsubscribe = null; // Purono listener bondho korar jonno

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = document.getElementById('passportInput').value.trim();
    const resultDiv = document.getElementById('result');
    const dataContent = document.getElementById('data-content');

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    if (unsubscribe) unsubscribe(); // Agey kono search thakle bondho hobe

    const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
    
    unsubscribe = onSnapshot(q, (snap) => {
        if (snap.empty) {
            alert("❌ No Record Found.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'submitted').toLowerCase().trim();

                // Reset all steps
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

                // --- SMART MAPPING LOGIC ---
                let activeStep = 1; 
                if (rawStatus === 'submitted' || rawStatus === 'pending') {
                    activeStep = 1;
                } else if (rawStatus === 'reviewing' || rawStatus === 'compliance' || rawStatus === 'under review') {
                    activeStep = 2;
                } else if (rawStatus === 'processing' || rawStatus === 'university' || rawStatus === 'applied') {
                    activeStep = 3;
                } else if (rawStatus === 'approved' || rawStatus === 'visa_success' || rawStatus === 'outcome') {
                    activeStep = 4;
                }

                // UI Stepper Update
                const stepKeys = ['submitted', 'compliance', 'processing', 'outcome'];
                for (let i = 1; i <= activeStep; i++) {
                    const el = document.getElementById(`step-${stepKeys[i-1]}`);
                    if (el) el.classList.add('active');
                }

                // Student Details Display
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'Processing...'}</span></div>
                    <div class="info-row"><span class="label">Stage:</span> <span class="val" style="color:#2ecc71;">${rawStatus.toUpperCase()}</span></div>
                    <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px; opacity:0.8;">
                        <b>Note:</b> ${d.complianceNote || "Our team is processing your application. Updates will appear here instantly."}
                    </div>
                `;
            });
        }
    });
});
