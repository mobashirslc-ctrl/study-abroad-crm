import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ১. এডমিন ডাটা লাইভ সিঙ্ক
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
});

// ২. স্মার্ট সার্চ লজিক (Eligibility Check)
document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const lang = parseFloat(document.getElementById('fLang').value) || 0;
    const degree = document.getElementById('fDegree').value;

    // PRD লজিক: রিকোয়ারমেন্ট ম্যাচ করলে কেবল তখনই দেখাবে
    const filtered = allUnis.filter(u => {
        return (country === "" || u.country.toLowerCase().includes(country)) &&
               (degree === "" || u.degree === degree) &&
               (gpa >= (parseFloat(u.minGPA) || 0)) &&
               (lang >= (parseFloat(u.minLangScore) || 0));
    });

    const wrapper = document.getElementById('searchResultWrapper');
    const container = document.getElementById('uniListContainer');
    wrapper.style.display = 'block';

    if (filtered.length > 0) {
        container.innerHTML = `<table><thead><tr><th>Uni Name</th><th>Intake</th><th>Commission</th><th>Action</th></tr></thead><tbody>` +
            filtered.map(u => `<tr>
                <td><b>${u.universityName}</b></td>
                <td>${u.intake}</td>
                <td style="color:var(--success)">৳${u.partnerComm}</td>
                <td><button class="btn-gold" style="padding:5px 15px; font-size:12px;" onclick="openApply('${u.universityName}', '${u.partnerComm}')">Apply</button></td>
            </tr>`).join('') + `</tbody></table>`;
    } else {
        container.innerHTML = `<div style="text-align:center; color:#ff4757; padding:20px;"><h3>Not Qualified!</h3><p>No university matches this student's GPA/Score.</p></div>`;
    }
};

// ৩. ফাইল আপলোড (Cloudinary)
async function uploadToCloudinary(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); 
    const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

window.openApply = (name, comm) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.selectedUni = { name, comm };
};

// ৪. সাবমিট এবং স্লিপ জেনারেশন
document.getElementById('submitAppBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const academicFile = document.getElementById('pdfAcademic').files[0];
    const otherFile = document.getElementById('pdfOthers').files[0];

    if (!name || !pass || !academicFile) return alert("Fill Name, Passport and Academic File!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Processing Files...";
    btn.disabled = true;

    try {
        const url1 = await uploadToCloudinary(academicFile);
        const url2 = await uploadToCloudinary(otherFile);

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name, passportNo: pass, partnerEmail: userEmail,
            university: window.selectedUni.name, commission: window.selectedUni.comm,
            status: 'pending', docs: { academic: url1, others: url2 },
            createdAt: serverTimestamp()
        });

        // স্লিপ ডাটা আপডেট
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = window.selectedUni.name;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        document.getElementById('slipID').innerText = docRef.id;

        // QR Code
        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), { text: docRef.id, width: 100, height: 100 });

        alert("Submission Successful! Printing Slip...");
        window.print();
        location.reload();

    } catch (e) {
        alert("Upload Error!");
        btn.disabled = false;
        btn.innerText = "Confirm Submission";
    }
};

// ৫. লাইভ ট্র্যাকিং (Google Drive View)
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const rawFile = d.docs?.academic || "#";
            // গুগল ড্রাইভ ভিউয়ার লিঙ্ক কনভার্ট
            const viewLink = `https://docs.google.com/viewer?url=${encodeURIComponent(rawFile)}&embedded=true`;
            
            return `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span style="color:var(--gold)">${d.status.toUpperCase()}</span></td>
                <td><a href="${viewLink}" target="_blank" style="color:#fff; background:#2ecc71; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:12px;">View Doc</a></td>
            </tr>`;
        }).join('');
    });
}

initTracking();
