import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

if (!userEmail) { window.location.href = 'index.html'; }

let globalFinalBalance = 0; 

// --- Navigation & Core UI ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { localStorage.clear(); location.href='index.html'; };
window.closeModal = () => { 
    document.getElementById('applyModal').style.display='none'; 
    document.getElementById('withdrawModal').style.display='none';
};

// --- Cloudinary Upload Logic ---
const uploadToCloudinary = async (file) => {
    if (!file) return ""; 
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "";
    } catch (e) { return ""; }
};

// --- University Searching with Filters ---
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
               (gpa >= minGPA) && 
               (langScore >= minLang);
    });
    renderSearch(filtered);
};

function renderSearch(data) {
    const container = document.getElementById('uniListContainer');
    document.getElementById('searchResultArea').style.display = 'block';
    if(data.length === 0) {
        container.innerHTML = "<tr><td colspan='6' align='center'>No University Found</td></tr>";
        return;
    }
    container.innerHTML = data.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | IELTS ${u.minIELTS}+</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>`).join('');
}

// --- Application Submission ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('appSName').value;
    const sPhone = document.getElementById('appSPhone').value;
    const sPass = document.getElementById('appSPass').value;
    if(!sName || !sPass) return alert("Required fields missing!");
    
    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "UPLOADING FILES..."; btn.disabled = true;

    try {
        const u1 = await uploadToCloudinary(document.getElementById('fileAcad').files[0]);
        const u2 = await uploadToCloudinary(document.getElementById('fileLang').files[0]);
        const u3 = await uploadToCloudinary(document.getElementById('filePass').files[0]);
        const u4 = await uploadToCloudinary(document.getElementById('fileOther').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: sPhone, passportNo: sPass,
            university: window.selectedUni.name, commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(), 
            status: 'submitted', 
            commissionStatus: 'waiting', 
            docs: { academic: u1, language: u2, passport: u3, others: u4 },
            createdAt: serverTimestamp()
        });
        
        alert("Application Submitted Successfully!");
        location.reload();
    } catch (e) { 
        alert("Error!"); 
        btn.disabled = false; 
        btn.innerText = "CONFIRM ENROLLMENT"; 
    }
};

// --- Tracking & Realtime Wallet Sync ---
onSnapshot(query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase())), (snap) => {
    let pendingWallet = 0; let finalWallet = 0; let trackHtml = "";
    
    // ম্যানুয়ালি সর্ট করা (Indexing Error এড়ানোর জন্য)
    const sortedApps = snap.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

    sortedApps.forEach(dSnap => {
        const d = dSnap.data();
        const comm = Number(d.commission) || 0;
        
        // ওয়ালেট ক্যালকুলেশন
        if(d.commissionStatus === 'pending') pendingWallet += comm;
        else if(d.commissionStatus === 'ready') finalWallet += comm;
        
        let dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
        
        // ৪টি ফাইলের ভিউ আইকন
        const docIcons = `
            <div style="display:flex; gap:8px; justify-content:center;">
                ${d.docs?.academic ? `<a href="${d.docs.academic}" target="_blank" title="Academic"><i class="fas fa-file-pdf" style="color:#00d2ff;"></i></a>` : ''}
                ${d.docs?.passport ? `<a href="${d.docs.passport}" target="_blank" title="Passport"><i class="fas fa-file-invoice" style="color:#00d2ff;"></i></a>` : ''}
                ${d.docs?.language ? `<a href="${d.docs.language}" target="_blank" title="Language"><i class="fas fa-certificate" style="color:#00d2ff;"></i></a>` : ''}
                ${d.docs?.others ? `<a href="${d.docs.others}" target="_blank" title="Others"><i class="fas fa-folder-plus" style="color:#00d2ff;"></i></a>` : ''}
            </div>`;

        trackHtml += `<tr>
            <td><b>${d.studentName}</b><br><small style="color:#888;">${d.university}</small></td>
            <td>${d.studentPhone || 'N/A'}</td>
            <td>${d.passportNo || 'N/A'}</td>
            <td><span class="status-pill ${d.status}">${(d.status || 'SUBMITTED').toUpperCase()}</span></td>
            <td>${docIcons}</td>
            <td>${dateStr}</td>
        </tr>`;
    });

    document.getElementById('homeTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6' align='center'>No Applications Found</td></tr>";
    
    globalFinalBalance = finalWallet;
    document.getElementById('topPending').innerText = `৳${pendingWallet.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳${finalWallet.toLocaleString()}`;
    
    const wdDisplay = document.getElementById('withdrawFinalBalance');
    if(wdDisplay) wdDisplay.innerText = finalWallet.toLocaleString();
});

// --- Withdraw Logic ---
const wdBtn = document.getElementById('wdBtn');
if(wdBtn) {
    wdBtn.onclick = () => {
        document.getElementById('wdAvailableText').innerText = `Available for Withdraw: ৳${globalFinalBalance.toLocaleString()}`;
        document.getElementById('withdrawModal').style.display = 'flex';
    };
}

document.getElementById('confirmWdBtn').onclick = async () => {
    const amount = Number(document.getElementById('wdReqAmount').value);
    const method = document.getElementById('wdMethod').value;
    const details = document.getElementById('wdAccountDetails').value;

    if(amount <= 0 || amount > globalFinalBalance) return alert("Invalid Amount!");
    if(!details) return alert("Enter account details!");

    await addDoc(collection(db, "withdrawals"), {
        partnerEmail: userEmail.toLowerCase(), amount, method, details, status: 'pending', createdAt: serverTimestamp()
    });
    alert("Withdrawal request sent!");
    document.getElementById('withdrawModal').style.display = 'none';
};

// --- Profile & Agency Name Display ---
(async () => {
    if(!userEmail) return;
    onSnapshot(collection(db, "users"), (snap) => {
        snap.forEach(uDoc => {
            const u = uDoc.data();
            if(u.email?.toLowerCase() === userEmail.toLowerCase()) {
                const welcomeName = document.getElementById('welcomeName');
                if(welcomeName) welcomeName.innerText = u.fullName || "Partner";
                
                // প্রোফাইল ট্যাবে ডাটা বসানো
                const pAgency = document.getElementById('pAgency');
                if(pAgency) pAgency.value = u.fullName || "";
            }
        });
    });
})();
