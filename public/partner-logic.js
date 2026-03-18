import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration (Same as your previous)
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

// Global Variables
let allUniversities = [];
const partnerEmail = localStorage.getItem('userEmail');
const partnerName = localStorage.getItem('partnerName') || 'Partner';
document.getElementById('partnerNameDisplay').innerText = partnerName;

// --- ১. স্মার্ট অ্যাসেসমেন্ট লজিক ---
function initAssessment() {
    const uniRef = collection(db, "universities");
    
    onSnapshot(uniRef, (snap) => {
        allUniversities = [];
        snap.forEach(doc => allUniversities.push({ id: doc.id, ...doc.data() }));
        filterUnis(); // Initial load
    });

    // ফিল্টার ইভেন্ট লিসেনার
    ['fCountry', 'fDegree', 'fGPA', 'fLang'].forEach(id => {
        document.getElementById(id).addEventListener('input', filterUnis);
    });
}

function filterUnis() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const lang = parseFloat(document.getElementById('fLang').value) || 0;

    const filtered = allUniversities.filter(u => {
        const mCountry = country === "" || u.country.toLowerCase().includes(country);
        const mDegree = degree === "" || u.degree === degree;
        const mGPA = gpa >= (parseFloat(u.minGPA) || 0);
        const mLang = lang >= (parseFloat(u.ieltsReq) || 0);
        return mCountry && mDegree && mGPA && mLang;
    });

    renderUniTable(filtered);
}

function renderUniTable(data) {
    const tbody = document.getElementById('uniList');
    document.getElementById('matchCount').innerText = `${data.length} found`;
    
    tbody.innerHTML = data.map(u => {
        // কমিশন ক্যালকুলেশন (৳ ১২০ রেট)
        const semesterFee = parseFloat(u.semesterFee) || 0;
        const commPct = parseFloat(u.partnerComm) || 0;
        const commBDT = (semesterFee * commPct / 100) * 120;

        return `
            <tr>
                <td><b>${u.universityName}</b><br><small style="opacity:0.6">${u.courseName || 'General'}</small></td>
                <td>
                    <span style="font-size:11px; color:#ffcc00">GPA: ${u.minGPA}</span><br>
                    <span style="font-size:11px; color:#fff">IELTS: ${u.ieltsReq}</span>
                </td>
                <td>$${semesterFee.toLocaleString()}</td>
                <td style="color:#2ecc71; font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
                <td><button class="btn-apply" onclick="openApplyModal('${u.id}', '${u.universityName}', ${commBDT})">Apply Visa</button></td>
            </tr>
        `;
    }).join('');
}

// --- ২. ফাইল আপলোড এবং অ্যাপ্লিকেশন সাবমিশন ---
window.openApplyModal = (id, name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { id, name, commission };
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;

    if (!sName || !sPass) return alert("Student Name and Passport are required!");

    btn.innerText = "Uploading PDFs...";
    btn.disabled = true;

    try {
        const fileInputs = ['pdfAcademic', 'pdfPassport', 'pdfLanguage', 'pdfOthers'];
        let urls = {};

        for (let id of fileInputs) {
            const file = document.getElementById(id).files[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "ihp_upload"); // Your Cloudinary Preset

                const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                urls[id] = data.secure_url;
            }
        }

        // Firebase-এ ডাটা সেভ
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: window.currentApp.name,
            commission: window.currentApp.commission,
            partnerEmail: partnerEmail,
            partnerName: partnerName,
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        });

        alert("Application Submitted Successfully!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("Upload Failed!");
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
};

// --- ৩. লাইভ ট্র্যাকিং এবং আর্নিং বক্স ---
function initTrackingAndEarning() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        let pendingTotal = 0;
        let finalTotal = 0;
        
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            
            // ইর্নিং ক্যালকুলেশন
            if (d.status === 'pending' || d.status === 'processing') {
                pendingTotal += parseFloat(d.commission) || 0;
            } else if (d.status === 'approved' || d.status === 'visa-received') {
                finalTotal += parseFloat(d.commission) || 0;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${d.studentName}</td>
                    <td>${d.passportNo}</td>
                    <td>${d.university}</td>
                    <td><span style="color:#ffcc00">${d.status.toUpperCase()}</span></td>
                    <td>${d.complianceStaff || 'Not Assigned'}</td>
                    <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : 'Just now'}</td>
                </tr>
            `;
        });

        document.getElementById('pendingEarn').innerText = `৳ ${pendingTotal.toLocaleString()}`;
        document.getElementById('finalEarn').innerText = `৳ ${finalTotal.toLocaleString()}`;
        
        if (finalTotal > 0) {
            document.getElementById('withdrawBtn').disabled = false;
        }
    });
}

// Initialize All
initAssessment();
initTrackingAndEarning();
