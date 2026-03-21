import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk", 
    authDomain: "ihp-portal-v3.firebaseapp.com", 
    projectId: "ihp-portal-v3", 
    storageBucket: "ihp-portal-v3.firebasestorage.app", 
    messagingSenderId: "481157902534", 
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('userEmail');

if (!userEmail) { window.location.href = 'index.html'; }

// --- Global Functions ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(document.getElementById(id)) document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Logout?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); };

// --- Sync Logic ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = ""; let allDocs = [];
        snap.forEach(dSnap => {
            const d = dSnap.data(); allDocs.push(d);
            const comm = Number(d.commission || 0);
            const s = (d.status || "").toLowerCase().trim();
            if (s === 'visa rejected') return;
            if (s === 'student paid to uni') final += comm;
            else if (s === 'verified') pending += comm;
        });
        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        allDocs.forEach(d => {
            const dt = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr><td><b>${d.studentName}</b><br><small>${d.university}</small></td><td>${d.passportNo}</td><td><span class="status-pill ${d.status}">${(d.status || 'submitted').toUpperCase()}</span></td><td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold);">View</a></td><td>${dt}</td></tr>`;
        });
        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = html;
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        if(document.getElementById('withdrawFinalBalance')) document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- Search & Apply ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => { allUnis = snap.docs.map(d => ({id: d.id, ...d.data()})); });

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const filtered = allUnis.filter(u => country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country)));
    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr><td><b>${u.uName}</b></td><td>${u.uDegree}</td><td>GPA ${u.minCGPA}+</td><td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td><td style="color:var(--gold);">৳${Number(u.partnerComm || 0).toLocaleString()}</td><td><button class="btn-gold" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td></tr>
    `).join('');
};

const uploadFile = async (file) => {
    if (!file) return "";
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "ihp_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: fd });
    const data = await res.json(); return data.secure_url;
};

// --- Submit & Premium Slip Logic ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value;
    if(!sName || !sPass) return alert("Required!");
    btn.innerText = "Uploading..."; btn.disabled = true;

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]);
        const appData = { studentName: sName, passportNo: sPass, university: window.selectedUni.name, commission: Number(window.selectedUni.comm), partnerEmail: userEmail.toLowerCase(), status: 'submitted', docs: { academic: acadUrl, passport: passUrl }, createdAt: serverTimestamp() };
        await addDoc(collection(db, "applications"), appData);

        // UI Update for Slip
        document.getElementById('rName').innerText = sName.toUpperCase();
        document.getElementById('rPass').innerText = sPass.toUpperCase();
        document.getElementById('rUni').innerText = window.selectedUni.name;
        document.getElementById('rDate').innerText = "DATE: " + new Date().toLocaleDateString('en-GB');
        const link = `https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        document.getElementById('rQR').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(link)}" />`;

        closeModal();
        document.getElementById('receiptModal').style.display = 'flex';
    } catch (e) { alert(e.message); } 
    finally { btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false; }
};

onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => { if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner'; });
