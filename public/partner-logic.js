import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ১. সিকিউরিটি চেক (লুপ বন্ধ করার জন্য একবার চেক হবে)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        if (!window.location.href.includes("login.html")) {
            window.location.replace("login.html");
        }
    }
});

// ২. লগআউট ফিক্স (সরাসরি ক্লিক হ্যান্ডলার)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.replace("login.html");
        } catch (err) {
            console.error(err);
        }
    });
}

// ৩. ট্যাব ফাংশন (উইন্ডো অবজেক্টে রাখা হয়েছে যাতে HTML থেকে কাজ করে)
window.tab = (id) => {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
};

// ৪. ডাটা সাবমিট এবং রিয়েল-টাইম লোড (বাকি সব আগের মতোই থাকবে)
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    document.getElementById('mTitle').innerText = u;
    document.getElementById('appModal').style.display = 'flex';
};

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.onclick = async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        if (!name || !pass) return alert("All fields required");
        try {
            await addDoc(collection(db, "applications"), {
                studentName: name, passport: pass, university: curUni,
                status: "Pending", partner: "GORUN LTD.", timestamp: new Date().toISOString()
            });
            alert("Success!");
            document.getElementById('appModal').style.display = 'none';
        } catch (e) { alert(e.message); }
    };
}

onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:#ffcc00">${d.status}</b></td><td>${new Date(d.timestamp).toLocaleDateString()}</td></tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});