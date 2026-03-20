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

let globalFinalBalance = 0; // Final balance tracker for withdrawal

// --- Global UI Helpers ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { localStorage.clear(); location.href='index.html'; };
window.closeModal = () => { document.getElementById('applyModal').style.display='none'; };

// --- Cloudinary Helper ---
const uploadToCloudinary = async (file) => {
    if (!file) return ""; 
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", {
            method: "POST", 
            body: formData
        });
        const data = await res.json();
        return data.secure_url || "";
    } catch (e) { return ""; }
};

// --- University Search & Apply ---
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
        return `<tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}<br>${u.uIntake}</td>
            <td>GPA ${u.minCGPA}+ | IELTS ${u.minIELTS}+</td>
            <td>৳${(u.uSemFee * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>`;
    }).join('');
}

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
            studentName: sName,
            studentPhone: sPhone,
            passportNo: sPass,
            university: window.selectedUni.name,
            commission: window.selectedUni.comm,
            partnerEmail: userEmail,
            status: 'pending', 
            commissionStatus: 'waiting',
            docs: { academic: u1, language: u2, passport: u3, others: u4 },
            createdAt: serverTimestamp()
        });
        generateSlip(sName, sPass, window.selectedUni.name);
    } catch (e) { 
        alert("Failed to submit!"); 
        btn.disabled = false;
        btn.innerText = "CONFIRM ENROLLMENT";
    }
};

function generateSlip(sName, sPass, uni) {
    const slip = document.getElementById('slipContent');
    slip.innerHTML = `<div style="text-align:center;"><img src="logo.jpeg" style="width:100px;"><h2>Confirmation Slip</h2><p>Student: ${sName}</p><p>Passport: ${sPass}</p><p>Uni: ${uni}</p></div>`;
    document.getElementById('applyModal').style.display = 'none';
    setTimeout(() => { window.print(); location.reload(); }, 1000);
}

// --- Live Wallet & Tracking ---
onSnapshot(query(collection(db, "applications"), where("partnerEmail", "==", userEmail)), (snap) => {
    let pendingWallet = 0; 
    let finalWallet = 0;   
    let trackHtml = "";
    
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const comm = Number(d.commission) || 0;
        const commStatus = d.commissionStatus || 'waiting';
        
        if(commStatus === 'pending') { pendingWallet += comm; } 
        else if(commStatus === 'ready') { finalWallet += comm; }

        let dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : '...';
        const docs = d.docs || {};
        let docLinks = "";
        if(docs.academic) docLinks += `<a href="${docs.academic}" target="_blank" style="text-decoration:none; margin-right:5px;">📄Acad</a>`;
        if(docs.passport) docLinks += `<a href="${docs.passport}" target="_blank" style="text-decoration:none; margin-right:5px;">🆔Pass</a>`;

        trackHtml += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.studentPhone || 'N/A'}</td> <td>${d.passportNo || 'N/A'}</td>  <td><span style="color:var(--gold); font-weight:bold;">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td>${docLinks || 'No Docs'}</td>
                <td>${dateStr}</td>
            </tr>`;
    });

    const homeBody = document.getElementById('homeTrackingBody');
    const sidebarBody = document.getElementById('sidebarTrackingBody');
    if(homeBody) homeBody.innerHTML = trackHtml || "<tr><td colspan='6' align='center'>No records</td></tr>";
    if(sidebarBody) sidebarBody.innerHTML = trackHtml || "<tr><td colspan='6' align='center'>No records</td></tr>";

    globalFinalBalance = finalWallet; // Update global for withdrawal validation
    document.getElementById('topPending').innerText = `৳${pendingWallet.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳${finalWallet.toLocaleString()}`;
    
    if(document.getElementById('wdBtn')) {
        document.getElementById('wdBtn').disabled = (finalWallet <= 0);
        document.getElementById('wdBtn').style.opacity = (finalWallet <= 0) ? "0.5" : "1";
    }
});

// --- Withdrawal Logic ---
document.getElementById('wdBtn').onclick = () => {
    if(globalFinalBalance <= 0) return;
    document.getElementById('wdAvailableText').innerText = `Your final balance is: ৳ ${globalFinalBalance.toLocaleString()}`;
    document.getElementById('withdrawModal').style.display = 'flex';
};

document.getElementById('confirmWdBtn').onclick = async () => {
    const method = document.getElementById('wdMethod').value;
    const details = document.getElementById('wdAccountDetails').value;
    const amount = Number(document.getElementById('wdReqAmount').value);

    if(!details || amount <= 0) return alert("Please enter valid details and amount.");
    if(amount > globalFinalBalance) return alert("You cannot withdraw more than your balance.");

    const btn = document.getElementById('confirmWdBtn');
    btn.innerText = "SENDING..."; btn.disabled = true;

    try {
        await addDoc(collection(db, "withdrawals"), {
            partnerEmail: userEmail,
            amount: amount,
            method: method,
            accountDetails: details,
            status: "pending",
            createdAt: serverTimestamp()
        });
        alert("Withdrawal request sent successfully!");
        document.getElementById('withdrawModal').style.display = 'none';
        // Reset fields
        document.getElementById('wdAccountDetails').value = "";
        document.getElementById('wdReqAmount').value = "";
    } catch (e) { alert("Error sending request."); }
    btn.disabled = false; btn.innerText = "SUBMIT REQUEST";
};

// --- Profile & Subscription Tracking ---
(async () => {
    if(!userEmail) return;
    // Real-time listener for partner profile (Name + Subscription)
    onSnapshot(doc(db, "partners", userEmail), (dSnap) => {
        if (dSnap.exists()) {
            const d = dSnap.data();
            
            // Profile fields
            document.getElementById('pAgency').value = d.agencyName || "";
            document.getElementById('pContact').value = d.contact || "";
            document.getElementById('pAddress').value = d.address || "";
            
            // Welcome Name
            document.getElementById('welcomeName').innerText = d.agencyName || "Partner";

            // Subscription Display
            const status = (d.subscriptionStatus || "Inactive").toUpperCase();
            const statusEl = document.getElementById('subStatusText');
            statusEl.innerText = status;
            statusEl.style.color = status === "ACTIVE" ? "#2ecc71" : "#e74c3c";
            document.getElementById('subExpiryText').innerText = d.expiryDate || "N/A";
        }
    });
})();

document.getElementById('saveProfileBtn').onclick = async () => {
    try {
        await setDoc(doc(db, "partners", userEmail), {
            agencyName: document.getElementById('pAgency').value, 
            contact: document.getElementById('pContact').value,
            address: document.getElementById('pAddress').value, 
            email: userEmail
        }, { merge: true });
        alert("Profile Saved!");
    } catch (e) { alert("Error saving profile!"); }
};
