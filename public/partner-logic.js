import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
  authDomain: "scc-partner-portal.firebaseapp.com",
  databaseURL: "https://scc-partner-portal-default-rtdb.firebaseio.com",
  projectId: "scc-partner-portal",
  storageBucket: "scc-partner-portal.firebasestorage.app",
  messagingSenderId: "13013457431",
  appId: "1:13013457431:web:9c2a470f569721b1cf9a52",
  measurementId: "G-TX0NQE79MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 1. Security Check: Redirect if not logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// 2. Tab Navigation logic
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(event) event.currentTarget.classList.add('active');
};

// 3. Modal logic
let curUni = "";
window.openApp = (u) => { 
    curUni = u; 
    const mTitle = document.getElementById('mTitle');
    const modal = document.getElementById('appModal');
    if(mTitle && modal) {
        mTitle.innerText = u; 
        modal.style.display = 'flex'; 
    }
};

// 4. Application Submission (Fix for the Blank Screen / Null Error)
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        submitBtn.onclick = async function() {
            const name = document.getElementById('sName').value;
            const pass = document.getElementById('sPass').value;
            
            if(!name || !pass) return alert("Required!");

            try {
                await addDoc(collection(db, "applications"), {
                    studentName: name,
                    passport: pass,
                    university: curUni,
                    status: "Pending",
                    partner: "GORUN LTD.",
                    timestamp: new Date().toISOString()
                });
                alert("Success! Sent to Compliance.");
                document.getElementById('appModal').style.display = 'none';
                document.getElementById('sName').value = "";
                document.getElementById('sPass').value = "";
            } catch (e) {
                alert("Error: " + e.message);
            }
        };
    }
});

// 5. Sync Tables
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${new Date(d.timestamp).toLocaleDateString()}</td></tr>`;
    });
    
    const tableBodies = document.querySelectorAll('.sharedBody');
    tableBodies.forEach(t => {
        t.innerHTML = r;
    });
});