import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// ১. এখানে Auth ইম্পোর্ট করা হয়েছে
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// ২. Auth ইনিশিয়ালাইজ করা হয়েছে
const auth = getAuth(app);

// ৩. সিকিউরিটি চেক: লগইন না থাকলে সরাসরি login.html এ পাঠিয়ে দিবে
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// --- আপনার আগের সব লজিক নিচে অপরিবর্তিত আছে ---

// Tab Navigation
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
};

let curUni = "";
window.openApp = (u) => { 
    curUni = u; 
    document.getElementById('mTitle').innerText = u; 
    document.getElementById('appModal').style.display = 'flex'; 
};

// Application Submission
document.getElementById('submitBtn').onclick = async function() {
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

// Sync Tables
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${new Date(d.timestamp).toLocaleDateString()}</td></tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});