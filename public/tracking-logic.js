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

// বাটন ক্লিক ইভেন্ট লিসেনার
document.getElementById('trackBtn').addEventListener('click', async () => {
    const passport = document.getElementById('passportInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!passport) {
        alert("Please enter a Passport Number!");
        return;
    }

    // সার্চিং মেসেজ
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `<div style="text-align:center; padding:20px;">Searching...</div>`;

    try {
        const q = query(collection(db, "applications"), where("passport", "==", passport));
        const snap = await getDocs(q);

        if (snap.empty) {
            resultDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#ff4d4d;">❌ No Record Found.</div>`;
        } else {
            resultDiv.innerHTML = ""; // আগের মেসেজ ক্লিয়ার করা
            snap.forEach(doc => {
                const d = doc.data();
                
                // সুন্দর করে ডাটা প্রদর্শন
                resultDiv.innerHTML = `
                    <div style="padding: 15px;">
                        <div class="info-row"><span class="label">Student Name:</span> <span>${d.studentName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Partner Name:</span> <span>${d.partnerName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">University:</span> <span>${d.university || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Status:</span> <span style="color:#00ff00; font-weight:bold;">${d.status || 'Pending'}</span></div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        resultDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#ff4d4d;">Error loading data.</div>`;
    }
});
