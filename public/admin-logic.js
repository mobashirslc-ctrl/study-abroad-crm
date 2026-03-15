import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// সিস্টেমের সব অ্যাপ্লিকেশন একবারে দেখা
onSnapshot(collection(db, "applications"), (snap) => {
    const tbody = document.querySelector('#adminTable tbody'); // আপনার HTML এ id চেক করে নিন
    let h = "";
    snap.forEach(ad => {
        const d = ad.data();
        h += `<tr>
                <td>${d.studentName}</td>
                <td>${d.partner}</td>
                <td>${d.status}</td>
                <td><button onclick="deleteEntry('${ad.id}')">Delete</button></td>
              </tr>`;
    });
    if(tbody) tbody.innerHTML = h;
});

window.deleteEntry = async (id) => {
    if(confirm("Are you sure?")) {
        await deleteDoc(doc(db, "applications", id));
    }
};