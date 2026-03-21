import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

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

// --- ১. গ্লোবাল মেনু ফাংশনস (যা আপনার সাইডবার সচল করবে) ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};

window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. লাইভ ট্র্যাকিং ও ড্যাশবোর্ড আপডেট ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let docsArray = [];

        snap.forEach(dSnap => {
            const d = dSnap.data();
            docsArray.push(d);
            const comm = Number(d.commission || 0);
            const status = (d.status || "submitted").toLowerCase();
            if (status !== 'visa rejected') {
                if (status === 'student paid to uni') final += comm;
                else if (status === 'verified') pending += comm;
            }
        }); 

        docsArray.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docsArray.forEach(d => {
            const status = (d.status || "submitted").toLowerCase();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status}">${status.toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody'); 
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        const withdrawEl = document.getElementById('withdrawFinalBalance');
        if(withdrawEl) withdrawEl.innerText = final.toLocaleString();
    });
};
syncDashboard(); 

// --- ৩. সার্চ ও ইউনিভার্সিটি লজিক ---
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

// --- ৪. ফাইল আপলোড ও সাবমিট অ্যাপ্লিকেশন ---
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
        const acadInput = document.getElementById('fileAcad');
        const passInput = document.getElementById('filePass');
        const acadUrl = (acadInput.files.length > 0) ? await uploadFile(acadInput.files[0]) : "No File";
        const passUrl = (passInput.files.length > 0) ? await uploadFile(passInput.files[0]) : "No File"; 

        const appData = {
            studentName: sName, passportNo: sPass,
            university: window.selectedUni ? window.selectedUni.name : "N/A",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(), status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        
        // --- PREMIUM SLIP GENERATION (Design Checked) ---
        const slipWin = window.open('', '_blank');
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const refNo = `SCC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        slipWin.document.write(`
            <html><head><title>Slip - ${sName}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f0f0f0; padding: 20px; }
                .card { background: white; max-width: 800px; margin: auto; border-bottom: 8px solid #2b0054; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .top { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #00a651; }
                .logo { flex: 1; display: flex; align-items: center; gap: 10px; color: #2b0054; }
                .ref { text-align: right; font-size: 12px; }
                .head { background: #eee; padding: 8px 15px; font-weight: bold; margin: 15px 0; font-size: 14px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; padding: 0 20px; gap: 10px; font-size: 14px; }
                .status { text-align: center; border: 2px dashed #00a651; padding: 15px; margin: 20px; border-radius: 10px; }
                .badge { background: #00a651; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; }
                @media print { .no-print { display: none; } }
            </style></head><body>
                <div class="card">
                    <div class="top">
                        <div class="logo">
                            <div style="background:#2b0054; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">S</div>
                            <b>Student Career Consultancy</b>
                        </div>
                        <div style="flex:1.5; text-align:center;"><h3>OFFICIAL ADMISSION SLIP</h3></div>
                        <div class="ref">REF: ${refNo}<br>DATE: ${new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    <div class="head">STUDENT & APPLICATION DETAILS</div>
                    <div class="grid">
                        <div>Student Name: <b>${sName.toUpperCase()}</b></div>
                        <div>Passport No: <b>${sPass.toUpperCase()}</b></div>
                        <div>University: <b>${appData.university}</b></div>
                        <div>Partner ID: <b>SCC-${userEmail.slice(0,3).toUpperCase()}</b></div>
                    </div>
                    <div class="status">
                        <span class="badge">✓ VERIFIED & IN-HOUSE PROCESSING</span><br><br>
                        <img src="${qrImg}" width="85"><br><small>Scan to Track Status</small>
                    </div>
                    <div style="text-align:center; padding-bottom:20px; font-size:12px; font-weight:bold; color:#2b0054;">"Your Dream Route to Global Education"</div>
                </div>
                <button onclick="window.print()" class="no-print" style="width:100%; padding:15px; background:#2b0054; color:white; margin-top:10px; cursor:pointer; border:none; font-weight:bold;">PRINT / SAVE AS PDF</button>
            </body></html>
        `);
        slipWin.document.close();

        alert("Submitted Successfully!");
        window.closeModal();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// --- ৫. প্রোফাইল নাম আপডেট ---
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
