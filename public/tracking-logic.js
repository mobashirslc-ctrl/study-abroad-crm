import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

document.getElementById('trackBtn').addEventListener('click', async () => {
    const inputVal = document.getElementById('passportInput').value.trim();
    const resultDiv = document.getElementById('result');
    const dataContent = document.getElementById('data-content');

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    // Reset UI
    resultDiv.style.display = "none";
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    try {
        // Dashboard-e 'passportNo' field use kora hoyeche, tai query-te seta-i thakbe
        const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("❌ No Record Found. Please check your Passport Number.");
        } else {
            resultDiv.style.display = "block";
            
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'pending').toLowerCase();

                // --- SMART MAPPING LOGIC ---
                // Dashboard-er status-ke Tracking-er 4-ta step-e map kora:
                let activeStep = 1; // Default: Submitted

                if (rawStatus === 'pending') {
                    activeStep = 1; // Step 1: Submitted
                } else if (rawStatus === 'reviewing' || rawStatus === 'compliance') {
                    activeStep = 2; // Step 2: Compliance
                } else if (rawStatus === 'processing' || rawStatus === 'university') {
                    activeStep = 3; // Step 3: Processing
                } else if (rawStatus === 'approved' || rawStatus === 'visa_success' || rawStatus === 'outcome') {
                    activeStep = 4; // Step 4: Outcome
                }

                // Stepper update kora
                updateStepperUI(activeStep);

                // Data display kora
                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'Under Evaluation'}</span></div>
                    <div class="info-row"><span class="label">Current Stage:</span> <span class="val" style="color:#2ecc71;">${rawStatus.toUpperCase()}</span></div>
                    <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:13px; opacity:0.9;">
                        <b>Note:</b> ${d.complianceNote || "Your file is being handled by our official processing team. Please wait for the next update."}
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection Error. Please try again.");
    }
});

function updateStepperUI(stepNumber) {
    const steps = ['submitted', 'compliance', 'university', 'outcome'];
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`step-${steps[i-1]}`);
        if (i <= stepNumber) {
            el.classList.add('active');
        }
    }
}
