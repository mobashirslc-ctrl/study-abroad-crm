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

const BDT_RATE = 120;
const partnerEmail = localStorage.getItem('userEmail');
const partnerRealName = localStorage.getItem('partnerName') || "Partner";

// Auth Check & Real Name Display
if (!partnerEmail) { 
    window.location.href = 'index.html'; 
} else {
    const nameDisplay = document.getElementById('partnerDisplayName');
    if(nameDisplay) nameDisplay.innerText = partnerRealName;
}

// 1. Dashboard Stats (Wallet compliance logic)
function loadDashboardStats() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let total = 0, processing = 0, pWallet = 0, fWallet = 0;
        snap.forEach(doc => {
            const d = doc.data();
            total++;
            if (d.status === 'verified' || d.status === 'processing') {
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

// 2. SMART ASSESSMENT & AUTO-SUGGEST (Admin Panel Data Connection)
function initSearch() {
    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const performSearch = () => {
            const country = (document.getElementById('fCountry').value || "").toLowerCase();
            const degree = document.getElementById('fDegree').value;
            const langType = document.getElementById('fLangType').value;
            const langScore = parseFloat(document.getElementById('fLangScore').value) || 0;
            const academicScore = parseFloat(document.getElementById('fAcademicScore').value) || 0;

            const filtered = allUnis.filter(u => {
                // Admin Panel এর ফিল্ড নামগুলো এখানে মিলিয়ে নিন
                const dbLangReq = parseFloat(u.ieltsReq) || 0;
                const dbGpaReq = parseFloat(u.gpaReq) || 0;

                return (u.country.toLowerCase().includes(country)) && 
                       (degree === "" || u.degree === degree) && 
                       (langType === "" || u.langType === langType) &&
                       (langScore === 0 || langScore >= dbLangReq) &&
                       (academicScore === 0 || academicScore >= dbGpaReq);
            });
            renderUnis(filtered);
            document.getElementById('matchCount').innerText = `${filtered.length} Matching Results`;
        };

        // অটো সাজেশনের জন্য ইভেন্ট লিসেনার
        ['fCountry', 'fDegree', 'fLangType', 'fLangScore', 'fAcademicScore'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', performSearch);
                el.addEventListener('change', performSearch);
            }
        });

        performSearch();
    });
}

function renderUnis(unis) {
    const container = document.getElementById('assessmentResults');
    if (!container) return;
    container.innerHTML = unis.map(u => {
        const commBDT = ((u.semesterFee * u.partnerComm) / 100) * BDT_RATE;
        return `
        <tr>
            <td><b style="color:var(--gold);">${u.universityName}</b><br><small style="opacity:0.6;">Intake: ${u.intake || 'N/A'}</small></td>
            <td>${u.country}</td>
            <td><span class="badge">${u.degree}</span><br><small>${u.langType || 'IELTS'}: ${u.ieltsReq}</small></td>
            <td>${u.currency || '$'}${u.semesterFee.toLocaleString()}<br><small style="color:var(--success);">Schol. Available</small></td>
            <td style="color:var(--success); font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', '${u.id}', ${u.partnerComm}, ${u.semesterFee})">Apply</button></td>
        </tr>`;
    }).join('');
}

// 3. Application Submission Logic
window.openApplyModal = (name, id, comm, fee) => {
    document.getElementById('targetUni').innerText = name;
    document.getElementById('sUni').value = name;
    document.getElementById('studentFormModal').style.display = 'flex';
    window.currentAppData = { id, commPct: comm, fee };
};

const CLOUD_NAME = "ddziennkh"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const CLOUDINARY_PRESET = "ihp_upload"; 

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    try {
        btn.innerText = "Processing..."; btn.disabled = true;
        const fileInputs = [{id:'filePassport',k:'passport'}, {id:'fileAcademic',k:'academic'}, {id:'fileLanguage',k:'language'}, {id:'fileOthers',k:'others'}];
        let urls = {};
        for (const item of fileInputs) {
            const file = document.getElementById(item.id).files[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file); formData.append("upload_preset", CLOUDINARY_PRESET);
                const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
                const data = await res.json();
                if (data.secure_url) urls[item.k] = data.secure_url;
            }
        }
        const appData = { 
            studentName: document.getElementById('sName').value, passportNo: document.getElementById('sPass').value, phone: document.getElementById('sPhone').value, 
            university: document.getElementById('sUni').value, commission: (window.currentAppData.fee * window.currentAppData.commPct) / 100, 
            partnerEmail: partnerEmail, partnerName: partnerRealName, status: 'pending', docs: urls, createdAt: serverTimestamp() 
        };
        await addDoc(collection(db, "applications"), appData);
        alert("Submitted Successfully!"); location.reload();
    } catch (e) { alert("Error: " + e.message); } 
    finally { btn.innerText = "Confirm & Submit"; btn.disabled = false; }
};

// 4. Tracking
function loadTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr><td><b>${d.studentName}</b></td><td>${d.university}</td><td><span class="badge" style="color:var(--gold);">${d.status.toUpperCase()}</span></td><td><i class="fa-solid fa-file-pdf"></i></td><td>${d.createdAt?.toDate() ? d.createdAt.toDate().toLocaleDateString() : "Just now"}</td></tr>`;
        });
        document.getElementById('trackingBody').innerHTML = html;
    });
}

loadDashboardStats(); initSearch(); loadTracking();
