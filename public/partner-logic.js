/* partner-logic.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// UPDATED: Match with Admin.html config
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

// --- Global UI Helpers ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { localStorage.clear(); location.href='index.html'; };
window.closeModal = () => { document.getElementById('applyModal').style.display='none'; };

// --- Cloudinary Helper ---
const uploadToCloudinary = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "lhp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziernkh/image/upload", {
            method: "POST", body: formData
        });
        const data = await res.json();
        return data.secure_url;
    } catch (e) { return null; }
};

// --- University Search Logic (Real-time) ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const langScore = parseFloat(document.getElementById('fLangScore').value) || 0;
    const degree = document.getElementById('fDegree').value;

    const filtered = allUnis.filter(u => {
        const dbCountry = (u.uCountry || "").toLowerCase();
        const minGPA = parseFloat(u.minCGPA) || 0;
        const minLang = parseFloat(u.minIELTS) || 0;
        return (country === "" || dbCountry.includes(country)) &&
               (degree === "" || u.uDegree === degree) &&
               (gpa >= minGPA) && (langScore >= minLang);
    });
    renderSearch(filtered);
};

function renderSearch(data) {
    const container = document.getElementById('uniListContainer');
    document.getElementById('searchResultArea').style.display = 'block';
    container.innerHTML = data.map(u => {
        return `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}<br>${u.uIntake}</td>
            <td>GPA ${u.minCGPA}+ | IELTS ${u.minIELTS}+</td>
            <td>${u.uSemFee} ${u.uCurrency}<br><small>≈ ৳${(u.uSemFee * 115).toLocaleString()}</small></td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>`;
    }).join('');
}

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

// --- Application Submission ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('appSName').value;
    const sPhone = document.getElementById('appSPhone').value;
    const sPass = document.getElementById('appSPass').value;
    const fAcad = document.getElementById('fileAcad').files[0];
    const fLang = document.getElementById('fileLang').files[0];
    const fPass = document.getElementById('filePass').files[0];
    const fOther = document.getElementById('fileOther').files[0];

    if(!sName || !sPass) return alert("Required fields missing!");
    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "UPLOADING..."; btn.disabled = true;

    try {
        const [u1, u2, u3, u4] = await Promise.all([
            uploadToCloudinary(fAcad), uploadToCloudinary(fLang),
            uploadToCloudinary(fPass), uploadToCloudinary(fOther)
        ]);

        await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: sPhone, passportNo: sPass,
            university: window.selectedUni.name, commission: window.selectedUni.comm,
            partnerEmail: userEmail, status: 'pending', docs: { academic: u1, language: u2, passport: u3, others: u4 },
            createdAt: serverTimestamp()
        });
        generateSlip(sName, sPass, window.selectedUni.name);
    } catch (e) { alert("Failed!"); btn.disabled = false; }
};

function generateSlip(sName, sPass, uni) {
    const slip = document.getElementById('slipContent');
    const partnerInfo = JSON.parse(localStorage.getItem('partnerProfile')) || {agency: 'Official Partner'};
    slip.innerHTML = `<div style="text-align:center;"><img src="logo.jpeg" style="width:120px;"><h2>Confirmation Slip</h2><h3>${sName}</h3><p>Passport: ${sPass}</p><p>Uni: ${uni}</p></div>`;
    document.getElementById('applyModal').style.display = 'none';
    setTimeout(() => { window.print(); location.reload(); }, 1000);
}

// --- Live Wallet & Tracking ---
onSnapshot(query(collection(db, "applications"), where("partnerEmail", "==", userEmail)), (snap) => {
    let pending = 0, final = 0, trackHtml = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const c = Number(d.commission) || 0;
        const s = d.status || 'pending';
        if(s === 'pending') pending += c; 
        else if(s === 'ready_for_payment' || s === 'paid') final += c;
        trackHtml += `<tr><td>${d.studentName}</td><td>${d.university}</td><td>${s.toUpperCase()}</td><td>${d.createdAt?.toDate().toLocaleDateString() || '...'}</td></tr>`;
    });
    document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    document.getElementById('homeTrackingBody').innerHTML = trackHtml;
    if(final > 0) document.getElementById('wdBtn').disabled = false;
});

// --- Profile Load/Save ---
(async () => {
    if(!userEmail) return;
    const dSnap = await getDoc(doc(db, "partners", userEmail));
    if (dSnap.exists()) {
        const d = dSnap.data();
        document.getElementById('pAgency').value = d.agencyName || "";
        document.getElementById('pContact').value = d.contact || "";
        document.getElementById('pAddress').value = d.address || "";
    }
})();

document.getElementById('saveProfileBtn').onclick = async () => {
    const agency = document.getElementById('pAgency').value;
    try {
        await setDoc(doc(db, "partners", userEmail), {
            agencyName: agency, contact: document.getElementById('pContact').value,
            address: document.getElementById('pAddress').value, email: userEmail
        }, { merge: true });
        localStorage.setItem('partnerProfile', JSON.stringify({agency}));
        alert("Saved!");
    } catch (e) { alert("Error!"); }
};
