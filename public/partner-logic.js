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

// ১. সিকিউরিটি চেক: লগইন না থাকলে রিডাইরেক্ট
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    }
});

// ২. ট্যাব ফাংশন (গ্লোবাল স্কোপে রাখা হয়েছে)
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
};

// ৩. অ্যাপ্লিকেশন সাবমিট ফাংশন
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    const modalTitle = document.getElementById('mTitle');
    const modal = document.getElementById('appModal');
    if(modalTitle) modalTitle.innerText = u;
    if(modal) modal.style.display = 'flex';
};

const submitBtn = document.getElementById('submitBtn');
if(submitBtn) {
    submitBtn.onclick = async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        
        if(!name || !pass) return alert("সবগুলো ঘর পূরণ করুন!");

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

            alert("সফলভাবে সাবমিট হয়েছে!");
            document.getElementById('appModal').style.display = 'none';
            document.getElementById('sName').value = "";
            document.getElementById('sPass').value = "";
        } catch(e) {
            alert("Error: " + e.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Application";
        }
    };
}

// ৪. ডাটা রিয়েল-টাইম আপডেট (লুপ ফিক্সড)
const q = query(collection(db, "applications"), orderBy("timestamp", "desc"));
onSnapshot(q, (snap) => {
    let tableRows = "";
    snap.forEach(doc => {
        const d = doc.data();
        tableRows += `
            <tr>
                <td>${d.studentName}</td>
                <td>${d.passport}</td>
                <td>${d.university}</td>
                <td><b style="color:#ffcc00">${d.status}</b></td>
                <td>${new Date(d.timestamp).toLocaleDateString()}</td>
            </tr>`;
    });
    
    // সব .sharedBody ক্লাস যুক্ত টেবিলে ডাটা পুশ করা
    document.querySelectorAll('.sharedBody').forEach(t => {
        t.innerHTML = tableRows;
    });
});

// ৫. লগআউট বাটন
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = () => {
        signOut(auth).then(() => {
            window.location.replace("login.html");
        });
    };
}