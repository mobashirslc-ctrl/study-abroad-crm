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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// window object-e function-ti attach kora jate HTML button theke call kora jay
window.checkStatus = async () => {
    const p = document.getElementById('passportNumber').value;
    const res = document.getElementById('resultArea');
    
    if(!p) {
        alert("Enter Passport Number!");
        return;
    }
    
    res.style.display = "block";
    res.innerHTML = "<span style='color: white;'>Searching Database...</span>";
    
    try {
        const q = query(collection(db, "applications"), where("passportNumber", "==", p)); 
        // Note: niche check korun apnar Firestore-e field-er nam "passport" naki "passportNumber"
        
        const snap = await getDocs(q);
        
        if(snap.empty) {
            res.innerHTML = "<span style='color: #ff4d4d;'>No Record Found for this Passport.</span>";
        } else {
            let output = "";
            snap.forEach(doc => {
                const d = doc.data();
                output += `
                    <div style="border: 1px solid #444; padding: 10px; border-radius: 5px; background: #222;">
                        <p style="margin: 5px 0;">Student: <b>${d.studentName}</b></p>
                        <p style="margin: 5px 0;">Status: <b style="color:#00ff00">${d.status}</b></p>
                    </div>
                `;
            });
            res.innerHTML = output;
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        res.innerHTML = "<span style='color: red;'>Error fetching data. Check Console.</span>";
    }
};