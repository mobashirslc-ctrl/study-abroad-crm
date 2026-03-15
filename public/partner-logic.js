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

// ১. সিকিউরিটি চেক
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    }
});

// ২. ট্যাব ফাংশন
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    event.currentTarget.classList.add('active');
};

// ৩. মডেল ওপেন
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    document.getElementById('mTitle').innerText = u;
    document.getElementById('appModal').style.display = 'flex';
};

// ৪. সাবমিট লজিক
const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.onclick = async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        if (!name || !pass) return alert("Required!");
        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";
            await addDoc(collection(db, "applications"), {
                studentName: name, passport: pass, university: curUni,
                status: "Pending", partner: "GORUN LTD.", timestamp: new Date().toISOString()
            });
            alert("Sent!");
            document.getElementById('appModal').style.display = 'none';
        } catch (e) { alert(e.message); }
        finally { submitBtn.disabled = false; submitBtn.innerText = "Submit Now"; }
    };
}

// ৫. ডাটা আপডেট
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${new Date(d.timestamp).toLocaleDateString()}</td></tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});

// ৬. লগআউট (index.html এ পাঠাবে)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        signOut(auth).then(() => window.location.replace("index.html"));
    };
}