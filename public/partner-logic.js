/* partner-logic.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- University & Search Logic ---
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
        const commBDT = (u.partnerComm || 0); // Assuming already in BDT or calculated
        return `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}<br>${u.uIntake || 'All Intakes'}</td>
            <td>GPA ${u.minCGPA}+ | IELTS ${u.minIELTS}+</td>
            <td>${u.uSemFee} ${u.uCurrency}<br><small>≈ ৳${(u.uSemFee * 115).toLocaleString()}</small></td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(commBDT).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${commBDT}')">APPLY</button></td>
        </tr>`;
    }).join('');
}

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

// --- Application & Slip Generation ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('appSName').value;
    const sPhone = document.getElementById('appSPhone').value;
    const sPass = document.getElementById('appSPass').value;
    
    if(!sName || !sPass) return alert("Student Name & Passport Required");

    try {
        const appRef = await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: sPhone, passportNo: sPass,
            university: window.selectedUni.name, commission: window.selectedUni.comm,
            partnerEmail: userEmail, status: 'pending', createdAt: serverTimestamp()
        });
        
        generateSlip(sName, sPass, window.selectedUni.name);
    } catch (e) { alert("Submission Failed!"); }
};

function generateSlip(sName, sPass, uni) {
    const slip = document.getElementById('slipContent');
    const partnerInfo = JSON.parse(localStorage.getItem('partnerProfile')) || {name: 'Official Partner'};
    
    slip.innerHTML = `
        <div style="text-align:center;">
            <img src="logo.jpeg" style="width:150px;">
            <h1 style="color:#1a0b4d; margin:20px 0;">Confirmation Letter</h1>
            <h2 style="background:#f1c40f; padding:10px;">CONGRATULATIONS: ${sName}</h2>
        </div>
        <table style="width:100%; border:1px solid #ddd; margin-top:20px;">
            <tr><td><b>Passport:</b> ${sPass}</td><td><b>University:</b> ${uni}</td></tr>
            <tr><td><b>Agency:</b> ${partnerInfo.agency || 'SCC Partner'}</td><td><b>Date:</b> ${new Date().toLocaleDateString()}</td></tr>
        </table>
        <div style="margin-top:30px; text-align:center;">
            <div id="qrcode" style="display:flex; justify-content:center; margin-bottom:10px;"></div>
            <p>Scan to track your file live</p>
        </div>
    `;
    
    new QRCode(document.getElementById("qrcode"), "https://study-abroad-crm-nine.vercel.app/track.html");
    
    document.getElementById('applyModal').style.display = 'none';
    setTimeout(() => { window.print(); location.reload(); }, 1000);
}

// --- Real-time Wallet & Tracking ---
onSnapshot(query(collection(db, "applications"), where("partnerEmail", "==", userEmail)), (snap) => {
    let pending = 0, final = 0, trackHtml = "";
    snap.forEach(doc => {
        const d = doc.data();
        const c = Number(d.commission) || 0;
        if(d.status === 'pending') pending += c; 
        else if(d.status === 'ready_for_payment' || d.status === 'paid') final += c;
        
        trackHtml += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:var(--gold)">${d.status}</span></td><td>${d.createdAt?.toDate().toLocaleDateString() || '...'}</td></tr>`;
    });
    
    document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    document.getElementById('homeTrackingBody').innerHTML = trackHtml;
    
    // Withdraw Button Logic
    if(final > 0) {
        document.getElementById('wdBtn').disabled = false;
        document.getElementById('wdWarning').style.display = 'none';
    }
});

// Profile Save Logic
document.getElementById('saveProfileBtn').onclick = () => {
    const profile = {
        agency: document.getElementById('pAgency').value,
        contact: document.getElementById('pContact').value,
        address: document.getElementById('pAddress').value
    };
    localStorage.setItem('partnerProfile', JSON.stringify(profile));
    alert("Profile Updated Successfully!");
};
