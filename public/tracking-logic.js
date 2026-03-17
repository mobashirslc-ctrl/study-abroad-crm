import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
  authDomain: "scc-partner-portal.firebaseapp.com",
  databaseURL: "https://scc-partner-portal-default-rtdb.firebaseio.com",
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

    if (!inputVal) {
        alert("Please enter a Passport Number!");
        return;
    }

    resultDiv.innerHTML = `<div style="text-align:center; padding:20px;">Searching...</div>`;

    try {
        // এখানে আপনার ডাটাবেজ অনুযায়ী passportNo ব্যবহার করা হয়েছে
        const q = query(collection(db, "applications"), where("passportNo", "==", inputVal));
        const snap = await getDocs(q);

        if (snap.empty) {
            resultDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#ff4d4d;">❌ No Record Found.</div>`;
        } else {
            resultDiv.innerHTML = ""; 
            snap.forEach(doc => {
                const d = doc.data();
                resultDiv.innerHTML += `
                    <div style="padding: 10px;">
                        <div class="info-row"><span class="label">Student:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">University:</span> <span class="val">${d.university || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Status:</span> <span class="val" style="color:#2ecc71; font-weight:bold;">${d.status || 'Pending'}</span></div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Error:", error);
        resultDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#ff4d4d;">Error loading data.</div>`;
    }
});
