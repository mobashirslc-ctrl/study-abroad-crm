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

window.checkStatus = async () => {
    const p = document.getElementById('passportNumber').value;
    const res = document.getElementById('resultArea');
    
    if(!p) {
        alert("Enter Passport Number!");
        return;
    }
    
    res.style.display = "block";
    res.innerHTML = "Searching Database...";
    
    try {
        // Apnar Firestore e field er nam "passport", tai ekhane "passport" use kora hoyeche
        const q = query(collection(db, "applications"), where("passport", "==", p));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            res.innerHTML = "<span style='color: #ff4d4d;'>No Record Found for this Passport.</span>";
        } else {
            let output = "";
            snap.forEach(doc => {
                const d = doc.data();
                output += `
                    <div style="border: 1px solid #444; padding: 15px; border-radius: 8px; background: #1a1a1a; margin-top: 10px;">
                        <p style="margin: 5px 0; color: #ddd;">Student Name: <b style="color: #fff;">${d.studentName}</b></p>
                        <p style="margin: 5px 0; color: #ddd;">Current Status: <b style="color: ${d.status === 'REJECTED' ? '#ff4d4d' : '#00ff00'}">${d.status}</b></p>
                        <p style="margin: 5px 0; color: #ddd;">University: <b>${d.university || 'N/A'}</b></p>
                    </div>
                `;
            });
            res.innerHTML = output;
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        res.innerHTML = "Error fetching data. Please try again.";
    }
};