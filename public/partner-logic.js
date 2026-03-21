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

// --- ২. ওয়ালেট ও লাইভ ট্র্যাকিং লজিক (Syncs both Home & Tracking Tables) ---
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

            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status}">${status.toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        // Live injection in both possible table bodies
        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody'); // Sidebar Tracking menu table ID
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        const withdrawEl = document.getElementById('withdrawFinalBalance');
        if(withdrawEl) withdrawEl.innerText = final.toLocaleString();
    });
};
syncDashboard(); 

// --- ৩. সার্চ ও এপ্লাই বাটন ---
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

// --- ৪. প্রিমিয়াম স্লিপ ও সাবমিট ---
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
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]); 

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        
        // --- PREMIUM 1101.PNG STYLE SLIP GENERATION ---
        const slipWin = window.open('', '_blank');
        const qrLink = `https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrLink)}`;
        const refNo = `SCC-2026-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        slipWin.document.write(`
            <html>
            <head>
                <title>Admission Slip - ${sName}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f0f0; padding: 20px; color: #333; }
                    .slip-card { background: white; max-width: 850px; margin: auto; border-bottom: 8px solid #2b0054; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
                    .top-bar { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #00a651; }
                    .logo-area { display: flex; align-items: center; gap: 10px; flex: 1; }
                    .logo-text { color: #2b0054; line-height: 1.1; }
                    .title-area { flex: 1.5; text-align: center; border-left: 1px solid #ddd; padding: 0 15px; }
                    .title-area h2 { color: #2b0054; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
                    .ref-box { background: #e8e0f0; padding: 10px; border-radius: 5px; font-size: 12px; }
                    .section-head { background: #e0e0e0; padding: 5px 15px; font-weight: bold; text-transform: uppercase; font-size: 13px; margin: 15px 0; border-radius: 3px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 20px; }
                    .info-item { display: flex; font-size: 14px; margin-bottom: 5px; }
                    .info-label { width: 120px; font-weight: 600; color: #555; }
                    .agency-banner { background: #00a651; color: white; padding: 5px 15px; margin: 20px 0 10px 0; font-weight: bold; }
                    .status-box { text-align: center; margin: 20px auto; padding: 15px; border: 2px dashed #00a651; width: fit-content; border-radius: 10px; }
                    .status-tag { background: #00a651; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; display: block; margin-bottom: 10px; }
                    .footer-text { text-align: center; font-style: italic; font-size: 12px; color: #2b0054; padding: 20px; }
                    @media print { .no-print { display: none; } body { background: white; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="slip-card">
                    <div class="top-bar">
                        <div class="logo-area">
                            <div style="background:#2b0054; color:white; width:45px; height:45px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold;">S</div>
                            <div class="logo-text"><b>Student Career<br>Consultancy</b><br><small>Your Dream Route to Global Education</small></div>
                        </div>
                        <div class="title-area">
                            <h2>OFFICIAL ACKNOWLEDGEMENT & ADMISSION SLIP</h2>
                        </div>
                        <div class="ref-box">
                            <b>REF NO:</b> ${refNo}<br><b>DATE:</b> ${new Date().toLocaleDateString('en-GB')}<br><b>TRACKING:</b> TRAK-${sPass.slice(-4)}
                        </div>
                    </div>

                    <div class="section-head">Applicant Information</div>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Full Name:</span> <b>${sName.toUpperCase()}</b></div>
                        <div class="info-item"><span class="info-label">Passport No:</span> <b>${sPass.toUpperCase()}</b></div>
                        <div class="info-item"><span class="info-label">University:</span> <b>${window.selectedUni.name}</b></div>
                        <div class="info-item"><span class="info-label">Course:</span> <b>MSc/Bachelors (Selected)</b></div>
                    </div>

                    <div class="agency-banner">AUTHORIZED AGENCY DETAILS</div>
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Agency:</span> <b>Partner Processing Hub</b></div>
                        <div class="info-item"><span class="info-label">Agent ID:</span> <b>SCC-PARTNER-${userEmail.slice(0,3).toUpperCase()}</b></div>
                    </div>

                    <div class="status-box">
                        <div class="status-tag">✓ VERIFIED & IN-HOUSE PROCESSING</div>
                        <img src="${qrImg}" width="80"><br>
                        <small>Scan to Track Application</small>
                    </div>

                    <div style="display:flex; justify-content:flex-end; padding: 0 40px;">
                        <div style="text-align:center;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Kirsch_Signature.png" width="100" style="filter: grayscale(1) brightness(0.5);"><br>
                            <div style="border-top:1px solid #000; width:150px; font-size:12px; font-weight:bold;">AUTHORIZED SIGNATURE & STAMP</div>
                        </div>
                    </div>

                    <div class="footer-text">
                        "Your Dream Route to Global Education"<br>
                        <small>Student Career Consultancy | Authorized B2B Processing Hub</small>
                    </div>
                </div>
                <button onclick="window.print()" class="no-print" style="position:fixed; bottom:20px; right:20px; padding:15px 30px; background:#2b0054; color:white; border:none; border-radius:50px; cursor:pointer; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.3);">PRINT / SAVE AS PDF</button>
            </body>
            </html>
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

// --- ৫. প্রোফাইল নেম আপডেট ---
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
