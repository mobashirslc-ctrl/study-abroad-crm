import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let allUnis = [];

// ১. এডমিন ডাটা সিঙ্ক
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
});

// ২. স্মার্ট সার্চ লজিক
document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const lang = parseFloat(document.getElementById('fLang').value) || 0;
    const degree = document.getElementById('fDegree').value;

    const filtered = allUnis.filter(u => {
        return (country === "" || u.country.toLowerCase().includes(country)) &&
               (degree === "" || u.degree === degree) &&
               (gpa >= (parseFloat(u.minGPA) || 0)) &&
               (lang >= (parseFloat(u.minLangScore) || 0));
    });

    const resultArea = document.getElementById('searchResultArea');
    const container = document.getElementById('uniListContainer');
    resultArea.style.display = 'block';

    if (filtered.length > 0) {
        container.innerHTML = filtered.map(u => `
            <tr>
                <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                <td>Gap: ${u.studyGap}y | Intake: ${u.intake}</td>
                <td>$${u.semesterFee}</td>
                <td style="color:var(--gold); font-weight:bold;">৳${u.partnerComm}</td>
                <td><button class="btn-gold" style="padding:8px 15px; font-size:11px;" onclick="openApply('${u.universityName}', '${u.partnerComm}')">Apply</button></td>
            </tr>`).join('');
    } else {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--danger);">No University matches this student's GPA/Score.</td></tr>`;
    }
};

// ৩. ক্লাউডিনারি আপলোড ফাংশন
async function uploadToCloud(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); 
    try {
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    } catch (e) { return ""; }
}

window.openApply = (name, comm) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.selectedApp = { name, comm };
};

// ৪. সাবমিট এবং স্লিপ প্রিন্ট
document.getElementById('submitAppBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const file1 = document.getElementById('pdfAcademic').files[0];
    const file2 = document.getElementById('pdfOthers').files[0];

    if (!name || !pass || !file1) return alert("Fill Name, Passport & Academic PDF!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "UPLOADING FILES...";
    btn.disabled = true;

    const url1 = await uploadToCloud(file1);
    const url2 = await uploadToCloud(file2);

    try {
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name, passportNo: pass, partnerEmail: userEmail,
            university: window.selectedApp.name, commission: window.selectedApp.comm,
            status: 'pending', docs: { academic: url1, others: url2 },
            createdAt: serverTimestamp()
        });

        // স্লিপ ডাটা
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = window.selectedApp.name;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        document.getElementById('slipID').innerText = docRef.id;

        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), { text: docRef.id, width: 120, height: 120 });

        alert("Application Submitted Successfully!");
        window.print();
        location.reload();
    } catch (e) { alert("Submission Failed!"); btn.disabled = false; }
};

// ৫. লাইভ ট্র্যাকিং ও প্রিভিউ ফিক্স
function initTracking() {
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

            const pdfUrl = d.docs?.academic || "#";
            // No Preview Fix: গুগল ড্রাইভ ভিউয়ারের বদলে ডাইরেক্ট লিঙ্ক + ব্রাউজার ভিউয়ার ট্রাই
            const viewLink = pdfUrl !== "#" ? `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true` : "#";

            tbody.innerHTML += `
            <tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span class="status-badge" style="background:rgba(255,204,0,0.1); color:var(--gold); border:1px solid var(--gold);">${d.status.toUpperCase()}</span></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...'}</td>
                <td>
                    <a href="${pdfUrl}" target="_blank" style="color:var(--success); text-decoration:none; font-size:12px; margin-right:10px;"><i class="fas fa-external-link-alt"></i> Direct</a>
                    <a href="${viewLink}" target="_blank" style="color:var(--gold); text-decoration:none; font-size:12px;"><i class="fas fa-eye"></i> Google View</a>
                </td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
}

initTracking();
