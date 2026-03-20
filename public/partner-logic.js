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

let globalFinalBalance = 0; 

// --- Navigation & Core UI ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { localStorage.clear(); location.href='index.html'; };
window.closeModal = () => { document.getElementById('applyModal').style.display='none'; };

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
            <td>${u.uDegree}<br>${u.uIntake}</td>
            <td>GPA ${u.minCGPA}+ | IELTS ${u.minIELTS}+</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>`).join('');
}

// --- Application Submission (UPDATED LOGIC) ---
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
            university: window.selectedUni.name, commission: window.selectedUni.comm,
            partnerEmail: userEmail, 
            status: 'submitted', 
            commissionStatus: 'waiting', // Default is waiting (0 in wallet)
            docs: { academic: u1, language: u2, passport: u3, others: u4 },
            createdAt: serverTimestamp()
        });
        generateSlip(sName, sPass, window.selectedUni.name);
    } catch (e) { alert("Error!"); btn.disabled = false; btn.innerText = "CONFIRM ENROLLMENT"; }
};

// --- Slip Generation ---
function generateSlip(sName, sPass, uni) {
    const slip = document.getElementById('slipContent');
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const pName = document.getElementById('pAgency').value || "Authorized Partner";
    const trackingLink = `https://study-abroad-crm-nine.vercel.app/track.html?id=${sPass}`;

    slip.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 30px; border: 2px solid #d4af37; max-width: 600px; margin: 0 auto; background: #fff; color: #333;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 20px;">
                <img src="logo.jpeg" style="width: 100px;">
                <div style="text-align: right;"><h2 style="color: #d4af37; margin: 0;">ACKNOWLEDGMENT</h2><p style="font-size: 10px; color: #666;">Date: ${today}</p></div>
            </div>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px; background: #f9f9f9;">Student:</td><td style="padding: 8px; font-weight: bold;">${sName}</td></tr>
                <tr><td style="padding: 8px; background: #f9f9f9;">Passport:</td><td style="padding: 8px; font-weight: bold;">${sPass}</td></tr>
                <tr><td style="padding: 8px; background: #f9f9f9;">University:</td><td style="padding: 8px; font-weight: bold; color:#d4af37;">${uni}</td></tr>
                <tr><td style="padding: 8px; background: #f9f9f9;">Agency:</td><td style="padding: 8px;">${pName}</td></tr>
            </table>
            <div style="display: flex; align-items: center; background: #fdfaf0; padding: 10px; border: 1px solid #f3ebd1;">
                <div id="qrcode_box"></div><div style="margin-left: 15px;"><p style="font-weight: bold; margin:0;">Scan to Track</p></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        new QRCode(document.getElementById("qrcode_box"), { text: trackingLink, width: 70, height: 70 });
        setTimeout(() => { window.print(); location.reload(); }, 1200);
    }, 400);
}

// --- Tracking & Realtime Wallet Sync (UPDATED) ---
onSnapshot(query(collection(db, "applications"), where("partnerEmail", "==", userEmail)), (snap) => {
    let pendingWallet = 0; let finalWallet = 0; let trackHtml = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const comm = Number(d.commission) || 0;
        
        // Wallet logic: Only show if staff verified or student paid
        if(d.commissionStatus === 'pending') pendingWallet += comm;
        else if(d.commissionStatus === 'ready') finalWallet += comm;
        
        let dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : '...';
        const ds = d.docs || {};
        let docLinks = ds.academic ? `<a href="${ds.academic}" target="_blank" style="color:var(--gold);">[View Docs]</a>` : "No Docs";

        trackHtml += `<tr>
            <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
            <td>${d.studentPhone || 'N/A'}</td>
            <td>${d.passportNo || 'N/A'}</td>
            <td><span style="color:var(--gold); font-weight:bold;">${(d.status || 'SUBMITTED').toUpperCase()}</span></td>
            <td>${docLinks}</td>
            <td>${dateStr}</td>
        </tr>`;
    });
    document.getElementById('homeTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6' align='center'>No Data</td></tr>";
    document.getElementById('sidebarTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6' align='center'>No Data</td></tr>";
    
    globalFinalBalance = finalWallet;
    document.getElementById('topPending').innerText = `৳${pendingWallet.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳${finalWallet.toLocaleString()}`;
    document.getElementById('withdrawFinalBalance').innerText = finalWallet.toLocaleString();
});

// --- Withdraw Logic ---
document.getElementById('wdBtn').onclick = () => {
    document.getElementById('wdAvailableText').innerText = `Available for Withdraw: ৳${globalFinalBalance}`;
    document.getElementById('withdrawModal').style.display = 'flex';
};

document.getElementById('confirmWdBtn').onclick = async () => {
    const amount = Number(document.getElementById('wdReqAmount').value);
    const method = document.getElementById('wdMethod').value;
    const details = document.getElementById('wdAccountDetails').value;

    if(amount <= 0 || amount > globalFinalBalance) return alert("Invalid Amount!");
    if(!details) return alert("Enter account details!");

    await addDoc(collection(db, "withdrawals"), {
        partnerEmail: userEmail, amount, method, details, status: 'pending', createdAt: serverTimestamp()
    });
    alert("Withdrawal request sent!");
    document.getElementById('withdrawModal').style.display = 'none';
};

// --- Profile Management ---
(async () => {
    if(!userEmail) return;
    onSnapshot(doc(db, "partners", userEmail), (dSnap) => {
        if (dSnap.exists()) {
            const d = dSnap.data();
            document.getElementById('pAgency').value = d.agencyName || "";
            document.getElementById('pContact').value = d.contact || "";
            document.getElementById('pAddress').value = d.address || "";
            document.getElementById('welcomeName').innerText = d.agencyName || "Partner";
            document.getElementById('subStatusText').innerText = (d.subscriptionStatus || "Active").toUpperCase();
            document.getElementById('subExpiryText').innerText = d.expiryDate || "31 Dec 2026";
        }
    });
})();

document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pContact').value, 
        address: document.getElementById('pAddress').value, 
        email: userEmail 
    }, { merge: true });
    alert("Profile Updated Successfully!");
};
