import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

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

// --- ১. গ্লোবাল ফাংশনস ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. ওয়ালেট ও লাইভ ট্র্যাকিং লজিক ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const comm = Number(d.commission || 0);
            const status = (d.status || "submitted").toLowerCase();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            if (status !== 'visa rejected') {
                if (status === 'student paid to uni') final += comm;
                else if (status === 'verified') pending += comm;
            }
            html += `<tr><td><b>${d.studentName}</b><br><small>${d.university}</small></td><td>${d.passportNo}</td><td><span class="status-pill ${status}">${status.toUpperCase()}</span></td><td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td><td>${dateStr}</td></tr>`;
        }); 
        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody');
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
};
syncDashboard(); 

// --- ৩. সার্চ ও এপ্লাই লজিক ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
}); 

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    const uniLabel = document.getElementById('modalUniName');
    if(modal && uniLabel) { uniLabel.innerText = name; modal.style.display = 'flex'; }
}; 

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const filtered = allUnis.filter(u => country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country))); 
    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr><td><b>${u.uName}</b><br><small>${u.uCountry}</small></td><td>${u.uDegree}</td><td>GPA ${u.minCGPA}+ | ${u.uLanguage}</td><td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td><td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td><td><button class="btn-gold" style="padding:5px 10px;" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td></tr>
    `).join('') || "<tr><td colspan='6' align='center'>No matches found.</td></tr>";
}; 

// --- ৪. ফাইল আপলোড ও স্লিপ জেনারেশন ---
const uploadFile = async (file) => {
    if (!file) return "No File";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "No File";
    } catch (err) { return "No File"; }
}; 

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 
    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    btn.innerText = "Processing..."; btn.disabled = true; 

    try {
        const acadFile = document.getElementById('fileAcad').files[0];
        const passFile = document.getElementById('filePass').files[0];
        
        const acadUrl = await uploadFile(acadFile);
        const passUrl = await uploadFile(passFile); 

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: window.selectedUni ? window.selectedUni.name : "N/A",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        
        // --- PREMIUM ACKNOWLEDGEMENT SLIP ---
        const slipWin = window.open('', '_blank');
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const refNo = `SCC-2026-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        slipWin.document.write(`
            <html><head><title>Admission Slip</title><style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f0f0; padding: 20px; }
                .slip-card { background: white; max-width: 850px; margin: auto; border-bottom: 8px solid #2b0054; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                .top-bar { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #00a651; }
                .logo-area { display: flex; align-items: center; gap: 10px; flex: 1; }
                .title-area { flex: 1.5; text-align: center; border-left: 1px solid #ddd; padding: 0 15px; }
                .ref-box { background: #f4f4f4; padding: 10px; border-radius: 5px; font-size: 12px; }
                .section-head { background: #e0e0e0; padding: 5px 15px; font-weight: bold; font-size: 13px; margin: 15px 0; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 20px; }
                .info-item { font-size: 14px; margin-bottom: 5px; }
                .agency-banner { background: #00a651; color: white; padding: 5px 15px; margin: 20px 0; font-weight: bold; }
                .status-box { text-align: center; margin: 20px auto; padding: 15px; border: 2px dashed #00a651; width: fit-content; border-radius: 10px; }
                .status-tag { background: #00a651; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; display: block; margin-bottom: 5px; }
                @media print { .no-print { display: none; } }
            </style></head><body>
                <div class="slip-card">
                    <div class="top-bar">
                        <div class="logo-area"><div style="background:#2b0054; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">S</div>
                        <div><b>Student Career<br>Consultancy</b></div></div>
                        <div class="title-area"><h3>OFFICIAL ACKNOWLEDGEMENT & ADMISSION SLIP</h3></div>
                        <div class="ref-box"><b>REF:</b> ${refNo}<br><b>DATE:</b> ${new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    <div class="section-head">APPLICANT INFORMATION</div>
                    <div class="info-grid">
                        <div class="info-item">Full Name: <b>${sName.toUpperCase()}</b></div>
                        <div class="info-item">Passport No: <b>${sPass.toUpperCase()}</b></div>
                        <div class="info-item">University: <b>${appData.university}</b></div>
                    </div>
                    <div class="agency-banner">AUTHORIZED AGENCY DETAILS</div>
                    <div class="info-grid"><div class="info-item">Partner Agency ID: <b>SCC-PARTNER-HUB</b></div></div>
                    <div class="status-box">
                        <div class="status-tag">✓ VERIFIED & IN-HOUSE PROCESSING</div>
                        <img src="${qrImg}" width="80"><br><small>Scan to Track Application</small>
                    </div>
                    <div style="text-align:right; padding: 20px 40px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Kirsch_Signature.png" width="80"><br>
                        <div style="border-top:1px solid #000; width:150px; float:right; font-size:10px;">AUTHORIZED SIGNATURE</div>
                    </div>
                    <div style="clear:both; text-align:center; padding: 20px; font-size:12px; color:#2b0054;">"Your Dream Route to Global Education"</div>
                </div>
                <button onclick="window.print()" class="no-print" style="width:100%; padding:15px; background:#2b0054; color:white; margin-top:10px; cursor:pointer;">PRINT SLIP</button>
            </body></html>
        `);
        slipWin.document.close();

        alert("Application Submitted Successfully!");
        closeModal();
    } catch (e) {
        alert("Critical Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
}; 
