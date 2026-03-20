import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  // Your existing config...
  apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
  authDomain: "scc-partner-portal.firebaseapp.com",
  projectId: "scc-partner-portal",
  storageBucket: "scc-partner-portal.firebasestorage.app",
  messagingSenderId: "13013457431",
  appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
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

    resultDiv.style.display = "none"; // Hide previous results
    
    try {
        const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("❌ No Record Found for this Passport Number.");
        } else {
            resultDiv.style.display = "block";
            dataContent.innerHTML = "";
            
            snap.forEach(doc => {
                const d = doc.data();
                const currentStatus = (d.status || "submitted").toLowerCase();

                // Clear active classes from all steps
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

                // Logic to light up the steps
                if(currentStatus === 'submitted') document.getElementById('step-submitted').classList.add('active');
                if(currentStatus === 'compliance') {
                    document.getElementById('step-submitted').classList.add('active');
                    document.getElementById('step-compliance').classList.add('active');
                }
                if(currentStatus === 'processing' || currentStatus === 'university') {
                    document.getElementById('step-submitted').classList.add('active');
                    document.getElementById('step-compliance').classList.add('active');
                    document.getElementById('step-university').classList.add('active');
                }
                if(currentStatus === 'approved' || currentStatus === 'visa' || currentStatus === 'outcome') {
                    document.querySelectorAll('.step').forEach(s => s.classList.add('active'));
                }

                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">Last Update:</span> <span class="val">${d.lastUpdate || 'Just Now'}</span></div>
                    <p style="font-size:12px; color:#ddd; margin-top:15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:10px;">
                        <b>Message:</b> ${d.complianceNote || "Your application is currently being processed by our compliance team."}
                    </p>
                `;
            });
        }
    } catch (error) {
        console.error("Error:", error);
        alert("System error. Please try again later.");
    }
});
