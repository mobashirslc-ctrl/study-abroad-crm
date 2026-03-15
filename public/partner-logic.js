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
        window.location.replace("login.html");
    }
});

// ২. ট্যাব ফাংশন
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

// ৩. মডেল কন্ট্রোল
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    document.getElementById('mTitle').innerText = u;
    document.getElementById('appModal').style.display = 'flex';
};

// ৪. সাবমিট ফাংশন
const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        if (!name || !pass) return alert("সব ঘর পূরণ করুন!");

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";
            await addDoc(collection(db, "applications"), {
                studentName: name, passport: pass, university: curUni,
                status: "Pending", partner: "GORUN LTD.", timestamp: new Date().toISOString()
            });
            alert("সফলভাবে পাঠানো হয়েছে!");
            document.getElementById('appModal').style.display = 'none';
        } catch (e) { alert("Error: " + e.message); }
        finally { submitBtn.disabled = false; submitBtn.innerText = "Submit Now"; }
    });
}

// ৫. ডাটা আপডেট (লুপ ফিক্সড)
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:#ffcc00">${d.status}</b></td><td>${new Date(d.timestamp).toLocaleDateString()}</td></tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});

// ৬. লগআউট (সরাসরি ক্লিক হ্যান্ডলার)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.replace("login.html"));
    });
}