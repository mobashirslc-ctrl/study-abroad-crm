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

// ১. সিকিউরিটি চেক: লগইন না থাকলে index.html (লগইন পেজ) এ পাঠিয়ে দাও
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // যদি বর্তমানে লগইন পেজে না থাকে, তবেই রিডাইরেক্ট করো (লুপ ঠেকানোর জন্য)
        if (!window.location.pathname.includes("index.html") && window.location.pathname !== "/") {
            window.location.replace("index.html");
        }
    }
});

// ২. লগআউট লজিক: index.html এ রিডাইরেক্ট হবে
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            console.log("Logged out successfully");
            window.location.replace("index.html");
        } catch (err) {
            console.error("Logout Error:", err);
            alert("Logout failed!");
        }
    });
}

// ৩. ট্যাব ফাংশন (Home/History স্যুইচ করার জন্য)
window.tab = (id) => {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
};

// ৪. অ্যাপ্লিকেশন সাবমিট লজিক
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    const mTitle = document.getElementById('mTitle');
    const modal = document.getElementById('appModal');
    if(mTitle) mTitle.innerText = u;
    if(modal) modal.style.display = 'flex';
};

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.onclick = async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        
        if (!name || !pass) return alert("All fields are required!");

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";
            
            await addDoc(collection(db, "applications"), {
                studentName: name,
                passport: pass,
                university: curUni,
                status: "Pending",
                partner: "GORUN LTD.",
                timestamp: new Date().toISOString()
            });

            alert("Application Submitted Successfully!");
            document.getElementById('appModal').style.display = 'none';
            document.getElementById('sName').value = "";
            document.getElementById('sPass').value = "";
        } catch (e) {
            alert("Submission Error: " + e.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Now";
        }
    };
}

// ৫. ডাটা রিয়েল-টাইম লোড (টেবিল আপডেট)
const q = query(collection(db, "applications"), orderBy("timestamp", "desc"));
onSnapshot(q, (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `
            <tr>
                <td>${d.studentName}</td>
                <td>${d.passport}</td>
                <td>${d.university}</td>
                <td><b style="color:#ffcc00">${d.status}</b></td>
                <td>${new Date(d.timestamp).toLocaleDateString()}</td>
            </tr>`;
    });
    
    const tableBodies = document.querySelectorAll('.sharedBody');
    tableBodies.forEach(t => {
        t.innerHTML = r;
    });
});