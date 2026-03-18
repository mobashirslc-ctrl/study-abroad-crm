import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, updateDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
document.getElementById('partnerNameDisplay').innerText = localStorage.getItem('partnerName') || 'Partner';

let allUnis = [];

// --- Cloudinary Upload Logic ---
async function uploadFile(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // আপনার প্রিসেট নাম
    try {
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    } catch (e) { console.error(e); return ""; }
}

// --- Assessment ---
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
    renderUniTable(allUnis);
});

function renderUniTable(data) {
    const tbody = document.getElementById('uniList');
    tbody.innerHTML = data.map(u => {
        const comm = (parseFloat(u.semesterFee) * parseFloat(u.partnerComm) / 100) * 120;
        return `<tr><td><b>${u.universityName}</b></td><td>Gap: ${u.studyGap}y</td><td>$${u.semesterFee}</td><td style="color:var(--success);">৳ ${comm.toLocaleString()}</td><td><button class="btn-gold" onclick="openApply('${u.universityName}', ${comm})">Apply</button></td></tr>`;
    }).join('');
}

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentAppData = { name, commission };
};

// --- Submission ---
document.getElementById('submitAppBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const file1 = document.getElementById('pdfAcademic').files[0];
    const file2 = document.getElementById('pdfOthers').files[0];

    if(!name || !pass || !file1) return alert("Student Name, Passport and Academic File are required!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Uploading Files...";
    btn.disabled = true;

    const url1 = await uploadFile(file1);
    const url2 = await uploadFile(file2);

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, passportNo: pass, partnerEmail: userEmail,
            university: window.currentAppData.name, commission: window.currentAppData.commission,
            status: 'pending', docs: { academic: url1, others: url2 }, createdAt: serverTimestamp()
        });
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipUni').innerText = window.currentAppData.name;
        new QRCode(document.getElementById("qrcode"), { text: pass, width: 100, height: 100 });
        document.getElementById('printArea').style.display = 'block';
        setTimeout(() => { window.print(); location.reload(); }, 1200);
    } catch (e) { alert("Error!"); btn.disabled = false; }
};

// --- Tracking ---
function initTracking() {
    if(!userEmail) return;
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = "";
        let pending = 0, final = 0;
        snap.forEach(doc => {
            const d = doc.data();
            const comm = Number(d.commission) || 0;
            if(d.status === 'pending') pending += comm;
            if(d.status === 'approved') final += comm;

            const fileUrl = d.docs?.academic || "#";
            const viewLink = fileUrl.includes('drive.google.com') ? `https://docs.google.com/viewer?url=${fileUrl}` : fileUrl;

            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td><td>${d.passportNo}</td><td>${d.status}</td><td>${d.complianceStaff || '-'}</td>
                <td>${fileUrl !== "#" ? `<a href="${viewLink}" target="_blank" style="color:var(--gold)">VIEW FILE</a>` : "No File"}</td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...'}</td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${final.toLocaleString()}`;
        document.getElementById('withdrawDisplay').innerText = `৳ ${final.toLocaleString()}`;
        document.getElementById('withdrawBtn').disabled = final <= 0;
    });
}
initTracking();
