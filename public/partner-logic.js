import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { /* আপনার ফায়ারবেস কনফিগ এখানে দিন */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('userEmail');

let allUnis = [];

// ১. এডমিন থেকে সরাসরি ইউনিভার্সিটি ডাটা আনা
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
});

// ২. সার্চ এবং এলিজিবিলিটি লজিক
document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const langScore = parseFloat(document.getElementById('fLang').value) || 0;

    const filtered = allUnis.filter(u => {
        const countryMatch = country === "" || u.country.toLowerCase().includes(country);
        const gpaMatch = gpa >= parseFloat(u.minGPA);
        const langMatch = langScore >= parseFloat(u.minLangScore);
        return countryMatch && gpaMatch && langMatch;
    });

    const resultArea = document.getElementById('searchResultArea');
    const container = document.getElementById('uniListContainer');
    resultArea.style.display = 'block';

    if (filtered.length > 0) {
        container.innerHTML = `<table><thead><tr><th>Uni Name</th><th>Fees</th><th>Action</th></tr></thead><tbody>` +
            filtered.map(u => `<tr>
                <td>${u.universityName}</td>
                <td>$${u.semesterFee}</td>
                <td><button class="btn-gold" onclick="openApply('${u.universityName}', '${u.partnerComm}')">Apply</button></td>
            </tr>`).join('') + `</tbody></table>`;
    } else {
        container.innerHTML = `<h3 style="color:red; text-align:center;">Sorry! You are Not Qualified for any university based on this data.</h3>`;
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
    window.currentAppData = { name, comm };
};

// ৪. ফর্ম সাবমিট এবং স্লিপ জেনারেট
document.getElementById('submitAppBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const academicFile = document.getElementById('pdfAcademic').files[0];
    const otherFile = document.getElementById('pdfOthers').files[0];

    if (!name || !pass || !academicFile) return alert("Fill Name, Passport & Academic File!");

    const btn = document.getElementById('submitAppBtn');
    btn.disabled = true;
    btn.innerText = "Uploading & Submitting...";

    try {
        const url1 = await uploadToCloudinary(academicFile);
        const url2 = await uploadToCloudinary(otherFile);

        await addDoc(collection(db, "applications"), {
            studentName: name,
            passportNo: pass,
            partnerEmail: userEmail,
            university: window.currentAppData.name,
            commission: window.currentAppData.comm,
            status: 'pending',
            docs: { academic: url1, others: url2 },
            createdAt: serverTimestamp()
        });

        // Acknowledgement Slip Data
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = window.currentAppData.name;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        
        new QRCode(document.getElementById("qrcode"), { text: pass, width: 100, height: 100 });
        
        alert("Success! Printing Acknowledgement Slip.");
        window.print();
        location.reload();

    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Submit Again";
    }
};

// ৫. লাইভ ট্র্যাকিং (গুগল ড্রাইভ ভিউ সহ)
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const fileUrl = d.docs?.academic || "#";
            // গুগল ড্রাইভ ভিউয়ার লিঙ্ক
            const viewLink = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
            
            return `<tr>
                <td>${d.studentName}</td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span style="color:var(--gold)">${d.status.toUpperCase()}</span></td>
                <td><a href="${viewLink}" target="_blank" style="color:white; background:green; padding:5px 10px; border-radius:5px; text-decoration:none;">View Doc</a></td>
            </tr>`;
        }).join('');
    });
}

initTracking();
