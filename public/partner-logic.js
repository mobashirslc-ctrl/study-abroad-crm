import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

let currentPartnerEmail = "";
let selectedUni = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.replace("index.html");
    else {
        currentPartnerEmail = user.email;
        const pDoc = await getDoc(doc(db, "partners", user.email));
        document.getElementById('partnerNameDisplay').innerText = pDoc.exists() ? pDoc.data().agencyName : user.email;
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        loadData();
    }
});

function loadData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", currentPartnerEmail));
    onSnapshot(q, (snap) => {
        let fullRows = "", dashRows = "", pending = 0, final = 0;
        snap.forEach(d => {
            const data = d.data();
            pending += parseFloat(data.pendingAmount || 0);
            final += parseFloat(data.finalAmount || 0);
            
            fullRows += `<tr><td>${data.studentName}</td><td>${data.contactNo}</td><td>${data.passportNumber}</td><td>${data.status}</td><td>${data.compliancePerson || '-'}</td><td>View</td><td>Just Now</td></tr>`;
            dashRows += `<tr><td>${data.studentName}</td><td>${data.university}</td><td>${data.status}</td></tr>`;
        });
        document.getElementById('fullTrackingBody').innerHTML = fullRows;
        document.getElementById('homeLiveBody').innerHTML = dashRows;
        document.getElementById('pendingAm').innerText = `৳ ${pending}`;
        document.getElementById('availAm').innerText = `৳ ${final}`;
        document.getElementById('walletBalance').innerText = `৳ ${final}`;
        document.getElementById('withdrawBtn').disabled = final <= 0;
    });
}

// Search & Apply Modal Logic (Simplified for brevity, similar to before)
window.openApplyModal = (name, comm) => {
    selectedUni = { name, comm };
    document.getElementById('mTitle').innerText = name;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    if(!sName || !sPass) return alert("Fill Name and Passport");

    const docRef = await addDoc(collection(db, "applications"), {
        studentName: sName,
        passportNumber: sPass,
        contactNo: document.getElementById('sContact').value,
        university: selectedUni.name,
        partnerEmail: currentPartnerEmail,
        pendingAmount: selectedUni.comm,
        finalAmount: 0,
        status: "INCOMING",
        timestamp: serverTimestamp()
    });

    // Generate QR & Show Slip
    document.getElementById('slipName').innerText = sName;
    document.getElementById('slipPass').innerText = sPass;
    document.getElementById('slipUni').innerText = selectedUni.name;
    document.getElementById('slipID').innerText = docRef.id;
    
    document.getElementById('qrcode').innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: docRef.id, width: 100, height: 100 });
    
    document.getElementById('appModal').style.display = 'none';
    document.getElementById('slipOverlay').style.display = 'flex';
};