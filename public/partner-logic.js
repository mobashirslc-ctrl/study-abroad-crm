import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. Firebase Configuration ---
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

// --- 2. Global Settings ---
const CLOUD_NAME = "ddziennkh"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const CLOUDINARY_PRESET = "ihp_upload"; 
const BDT_RATE = 120; // ১ ডলার = ১২০ টাকা (কমিশন ক্যালকুলেশনের জন্য)

const partnerEmail = localStorage.getItem('userEmail');
if (!partnerEmail) { window.location.href = 'index.html'; }

// --- 3. Dashboard Wallet Logic (Compliance Split) ---
function loadDashboardStats() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let total = 0, processing = 0, pWallet = 0, fWallet = 0;
        snap.forEach(doc => {
            const d = doc.data();
            total++;
            // Compliance 'verified' করলেই পেন্ডিং ওয়ালেটে আসবে
            if (d.status === 'verified' || d.status === 'processing') {
                processing++;
                pWallet += (d.commission || 0);
            }
            // Admin 'paid' নিশ্চিত করলে ফাইনাল ওয়ালেটে আসবে
            if (d.commStatus === 'paid') { 
                fWallet += (d.commission || 0); 
            }
        });
        document.getElementById('statTotalStudents').innerText = total;
        document.getElementById('statActiveFiles').innerText = processing;
        document.getElementById('pendingWallet').innerText = "৳ " + (pWallet * BDT_RATE).toLocaleString();
        document.getElementById('finalWallet').innerText = "৳ " + (fWallet * BDT_RATE).toLocaleString();
        document.getElementById('walletBalanceDisplay').innerText = "৳ " + (fWallet * BDT_RATE).toLocaleString();
    });
}

// --- 4. Advanced Search & Assessment (Points 1 & 2) ---
function initSearch() {
    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const filterData = () => {
            const country = (document.getElementById('fCountry').value || "").toLowerCase();
            const degree = document.getElementById('fDegree').value;
            const langTest = document.getElementById('fLangType').value;
            const langScore = parseFloat(document.getElementById('fLangScore').value) || 0;
            const academicScore = parseFloat(document.getElementById('fAcademicScore').value) || 0;

            const filtered = allUnis.filter(u => {
                const dbLangReq = parseFloat(u.ieltsReq) || 0;
                const dbGpaReq = parseFloat(u.gpaReq) || 0;

                return (u.country.toLowerCase().includes(country)) && 
                       (degree === "" || u.degree === degree) &&
                       (langTest === "" || u.langType === langTest) &&
                       (langScore === 0 || langScore >= dbLangReq) &&
                       (academicScore === 0 || academicScore >= dbGpaReq);
            });
            renderUnis(filtered);
        };

        ['fCountry', 'fDegree', 'fLangType', 'fLangScore', 'fAcademicScore'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.oninput = filterData;
        });
        filterData();
    });
}

function renderUnis(unis) {
    const container = document.getElementById('assessmentResults');
    if (!container) return;

    container.innerHTML = unis.map(u => {
        // কমিশন ক্যালকুলেশন সব সময় টাকাতে (৳)
        const commBDT = ((u.semesterFee * u.partnerComm) / 100) * BDT_RATE;
        
        return `
        <div class="uni-card" style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; box-shadow:0 4px 6px rgba(0,0,0,0.02); margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3 style="margin:0; color:#b8860b; font-size:20px;">${u.universityName}</h3>
                    <p style="margin:5px 0; color:#666; font-size:14px;"><i class="fa-solid fa-location-dot"></i> ${u.country} | <b>Intake:</b> ${u.intake || 'Sep / Jan'}</p>
                </div>
                <span style="background:#fdf9f0; color:#b8860b; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; border:1px solid #b8860b;">${u.degree}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin:15px 0; font-size:13px; color:#444; background:#f9f9f9; padding:12px; border-radius:8px;">
                <span><b>Fee:</b> ${u.currency || '$'} ${u.semesterFee.toLocaleString()}</span>
                <span><b>Scholarship:</b> ${u.scholarship || 'Up to 30%'}</span>
                <span><b>Language Req:</b> ${u.langType || 'IELTS'} ${u.ieltsReq || '6.0'}</span>
                <span><b>Living Cost:</b> ${u.livingCost || 'Moderate'}</span>
            </div>

            <div style="background:#e8f5e9; border: 1px dashed #27ae60; padding:15px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <small style="color:#27ae60; font-weight:bold; text-transform:uppercase; font-size:10px;">Partner Commission</small>
                    <h4 style="margin:0; color:#27ae60; font-size:20px;">৳ ${commBDT.toLocaleString()} <span style="font-size:12px; font-weight:normal; color:#666;">(${u.partnerComm}%)</span></h4>
                </div>
                <button class="btn-gold" onclick="openApplyModal('${u.universityName}', '${u.id}', ${u.partnerComm}, ${u.semesterFee})" style="padding:10px 20px;">Apply Now</button>
            </div>
        </div>`;
    }).join('');
}

// --- 5. Application Submission Logic ---
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
        btn.innerText = "Processing..."; btn.disabled = true;
        const fileInputs = [{id:'filePassport',k:'passport'}, {id:'fileAcademic',k:'academic'}, {id:'fileLanguage',k:'language'}, {id:'fileOthers',k:'others'}];
        let urls = {};
        
        for (const item of fileInputs) {
            const file = document.getElementById(item.id).files[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", CLOUDINARY_PRESET);
                const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
                const data = await res.json();
                if (data.secure_url) { urls[item.k] = data.secure_url; }
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

    } catch (e) { alert("Error: " + e.message); } 
    finally { btn.innerText = "Confirm & Submit"; btn.disabled = false; }
};

// --- 6. Tracking & PDF Viewer (Google Docs) ---
function loadTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let apps = [];
        snap.forEach(doc => { apps.push({ id: doc.id, ...doc.data() }); });
        apps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let html = "";
        apps.forEach(d => {
            const docs = d.docs || {};
            const getSafeLink = (url) => {
                if (!url) return "#";
                return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            };

            const docLinks = `
                <div style="display: flex; gap: 10px;">
                    ${docs.passport ? `<a href="${getSafeLink(docs.passport)}" target="_blank" style="color:#ffcc00;"><i class="fa-solid fa-file-pdf"></i></a>` : ''}
                    ${docs.academic ? `<a href="${getSafeLink(docs.academic)}" target="_blank" style="color:#3498db;"><i class="fa-solid fa-graduation-cap"></i></a>` : ''}
                    ${docs.language ? `<a href="${getSafeLink(docs.language)}" target="_blank" style="color:#2ecc71;"><i class="fa-solid fa-language"></i></a>` : ''}
                </div>`;

            html += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.university}</td>
                <td><span class="badge" style="background:${d.status === 'verified' ? '#27ae60' : (d.status === 'pending' ? '#f39c12' : '#e74c3c')}">${d.status.toUpperCase()}</span></td>
                <td>${docLinks}</td>
                <td>${d.createdAt?.toDate() ? d.createdAt.toDate().toLocaleDateString() : "Just now"}</td>
            </tr>`;
        });
        document.getElementById('trackingBody').innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No data found.</td></tr>`;
    });
}

// Initialize all functions
loadDashboardStats(); 
initSearch(); 
loadTracking();
