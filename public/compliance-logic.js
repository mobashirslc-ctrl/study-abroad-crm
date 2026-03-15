import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let activeId = "";

onSnapshot(collection(db, "applications"), (snap) => {
    const tbody = document.querySelector('#incoming tbody');
    let h = "";
    snap.forEach(ad => {
        const d = ad.data();
        h += `<tr><td>${d.studentName}</td><td>${d.partner}</td><td>${d.status}</td><td>${d.handledBy || "Unclaimed"}</td><td><button class="btn-claim" onclick="openReview('${ad.id}', '${d.studentName}')">Claim</button></td></tr>`;
    });
    tbody.innerHTML = h;
});

window.openReview = (id, name) => {
    activeId = id;
    document.querySelector('.slider .font-bold').innerText = name;
    document.getElementById('slider').classList.add('active');
};

window.applyStatus = async () => {
    const s = document.getElementById('statusSelect').value;
    if(!activeId) return;
    await updateDoc(doc(db, "applications", activeId), { status: s, handledBy: "Staff #01" });
    alert("Status Updated!");
    document.getElementById('slider').classList.remove('active');
};