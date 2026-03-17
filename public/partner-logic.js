import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- Cloudinary Settings (Exact Match from Screenshot 769.jpg) ---
const CLOUD_NAME = "ddziennkh"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const CLOUDINARY_PRESET = "ihp_upload"; // আপনার নতুন তৈরি করা Unsigned প্রিসেট

const partnerEmail = localStorage.getItem('userEmail');
const BDT_RATE = 120;

if (!partnerEmail) { window.location.href = 'index.html'; }

// --- 1. Dashboard Stats ---
function loadDashboardStats() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let total = 0, processing = 0, pWallet = 0, fWallet = 0;
        snap.forEach(doc => {
            const d = doc.data();
            total++;
            if (d.status === 'pending' || d.status === 'processing') {
                processing++;
                pWallet += (d.commission || 0);
            }
            if (d.commStatus === 'paid') { fWallet += (d.commission || 0); }
        });
        document.getElementById('statTotalStudents').innerText = total;
        document.getElementById('statActiveFiles').innerText = processing;
        document.getElementById('pendingWallet').innerText = "৳ " + (pWallet * BDT_RATE).toLocaleString();
        document.getElementById('finalWallet').innerText = "৳ " + (fWallet * BDT_RATE).toLocaleString();
        document.getElementById('walletBalanceDisplay').innerText = "৳ " + (fWallet * BDT_RATE).toLocaleString();
    });
}

// --- 2. Smart Search ---
function initSearch() {
    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const filterData = () => {
            const country = (document.getElementById('fCountry').value || "").toLowerCase();
            const degree = document.getElementById('fDegree').value;
            const score = parseFloat(document.getElementById('fLangScore').value) || 0;

            const filtered = allUnis.filter(u => {
                const dbScore = parseFloat(u.ieltsReq?.replace(/[^0-9.]/g, '')) || 0;
                return (u.country.toLowerCase().includes(country)) &&
                       (degree === "" || u.degree === degree) &&
                       (dbScore >= score);
            });
            renderUnis(filtered);
        };
        document.getElementById('fCountry').oninput = filterData;
        document.getElementById('fDegree').onchange = filterData;
        document.getElementById('fLangScore').oninput = filterData;
        filterData();
    });
}

function renderUnis(unis) {
    const container = document.getElementById('assessmentResults');
    document.getElementById('matchCount').innerText = unis.length + " Universities Found";
    container.innerHTML = unis.map(u => {
        const commBDT = ((u.semesterFee * u.partnerComm) / 100) * BDT_RATE;
        return `<tr>
            <td><b>${u.universityName}</b></td>
            <td>${u.country}</td>
            <td><span class="badge">${u.degree}</span><br><small>${u.ieltsReq}</small></td>
            <td>$${u.semesterFee}</td>
            <td style="color:#2ecc71; font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', '${u.id}', ${u.partnerComm}, ${u.semesterFee})">Apply</button></td>
        </tr>`;
    }).join('');
}

// --- 3. Application Submission ---
window.openApplyModal = (name, id, comm, fee) => {
    document.getElementById('targetUni').innerText = name;
    document.getElementById('sUni').value = name;
    document.getElementById('studentFormModal').style.display = 'flex';
    window.currentAppData = { id, commPct: comm, fee };
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;

    if(!sName || !sPass) return alert("Required fields missing!");

    try {
        btn.innerText = "Uploading Files..."; 
        btn.disabled = true;

        const fileInputs = [
            { id: 'filePassport', key: 'passport' },
            { id: 'fileAcademic', key: 'academic' },
            { id: 'fileLanguage', key: 'language' },
            { id: 'fileOthers', key: 'others' }
        ];

        let urls = {};

        for (const item of fileInputs) {
            const file = document.getElementById(item.id).files[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", CLOUDINARY_PRESET);

                const response = await fetch(CLOUDINARY_URL, { 
                    method: "POST", 
                    body: formData 
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || "Upload failed");
                }
                
                const data = await response.json();
                urls[item.key] = data.secure_url;
            }
        }

        const appData = {
            studentName: sName,
            passportNo: sPass,
            phone: document.getElementById('sPhone').value,
            university: document.getElementById('sUni').value,
            commission: (window.currentAppData.fee * window.currentAppData.commPct) / 100,
            partnerEmail: partnerEmail,
            partnerName: localStorage.getItem('partnerName') || "Partner",
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "applications"), appData);
        
        document.getElementById('studentFormModal').style.display = 'none';
        document.getElementById('slipModal').style.display = 'flex';
        document.getElementById('slipInfo').innerText = sName + " | " + appData.university;
        
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), { text: docRef.id, width: 128, height: 128 });

    } catch (e) {
        alert("Upload Error: " + e.message);
    } finally {
        btn.innerText = "Confirm & Submit"; 
        btn.disabled = false;
    }
};

// --- 4. Tracking Table ---
function loadTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(doc => {
            const d = doc.data();
            const docs = d.docs || {};
            const docLinks = `
                <div style="display: flex; gap: 8px;">
                    ${docs.passport ? `<a href="${docs.passport}" target="_blank" style="color:#ffcc00;"><i class="fa-solid fa-passport"></i></a>` : ''}
                    ${docs.academic ? `<a href="${docs.academic}" target="_blank" style="color:#3498db;"><i class="fa-solid fa-user-graduate"></i></a>` : ''}
                    ${docs.language ? `<a href="${docs.language}" target="_blank" style="color:#2ecc71;"><i class="fa-solid fa-language"></i></a>` : ''}
                    ${docs.others ? `<a href="${docs.others}" target="_blank" style="color:#e67e22;"><i class="fa-solid fa-file-invoice"></i></a>` : ''}
                </div>`;

            html += `<tr>
                <td>${d.studentName}</td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span class="badge" style="background:orange; color:black;">${d.status}</span></td>
                <td>${docLinks}</td>
                <td>${d.createdAt?.toDate() ? d.createdAt.toDate().toLocaleDateString() : "Today"}</td>
            </tr>`;
        });
        document.getElementById('trackingBody').innerHTML = html;
    });
}

loadDashboardStats(); 
initSearch(); 
loadTracking();
