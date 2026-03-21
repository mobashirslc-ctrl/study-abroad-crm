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

// --- ১. গ্লোবাল মেনু ফাংশনস ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. ড্যাশবোর্ড সিঙ্ক ও ট্র্যাকিং ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let docsArray = [];
        snap.forEach(dSnap => {
            const d = dSnap.data();
            docsArray.push(d);
            const comm = Number(d.commission || 0);
            const status = (d.status || "").toLowerCase().trim();
            if (status !== 'visa rejected') {
                if (status === 'student paid to uni') final += comm;
                else if (status === 'verified') pending += comm;
            }
        }); 
        docsArray.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        docsArray.forEach(d => {
            const status = (d.status || "submitted").toLowerCase();
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status.replace(/\s+/g, '-')}">${status.toUpperCase()}</span></td>
                <td><button class="btn-gold" style="padding:4px 10px; font-size:11px;" onclick="window.printSlip('${d.studentName}', '${d.passportNo}', '${d.university}')">PRINT SLIP</button></td>
                <td>${d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...'}</td>
            </tr>`;
        }); 
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5'>No Data</td></tr>";
        document.getElementById('trackingTableBody').innerHTML = html || "<tr><td colspan='5'>No Data</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
};
syncDashboard(); 

// --- ৩. ফাইল আপলোড লজিক ---
const uploadFile = async (file) => {
    if (!file) return "No File";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "No File";
    } catch (e) { return "No File"; }
}; 

// --- ৪. সাবমিশন লজিক ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 
    if(!sName || !sPass) return alert("Fill Name and Passport!");
    btn.innerText = "Uploading Files..."; btn.disabled = true; 

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]); 

        const appData = {
            studentName: sName, passportNo: sPass,
            university: window.selectedUni ? window.selectedUni.name : "N/A",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(), status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        alert("File successfully opened and submitted! Please check the Tracking Table to print the slip.");
        window.closeModal();
        window.showTab('tracking', document.querySelector('[onclick*="tracking"]'));
    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false; }
};

// --- ৫. প্রিমিয়াম স্লিপ ডিজাইন (Partner Details সহ) ---
window.printSlip = (name, passport, uni) => {
    const slipWin = window.open('', '_blank');
    if (!slipWin) return alert("Please allow pop-ups to print.");

    const partnerID = "SCC-" + userEmail.split('@')[0].toUpperCase();

    slipWin.document.write(`
        <html><head><title>Official Slip - ${name}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f9f9f9; }
            .slip-box { border: 4px solid #2b0054; padding: 30px; border-radius: 15px; max-width: 600px; margin: auto; background: white; position: relative; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
            .header { border-bottom: 3px solid #00a651; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
            .logo-main { color: #2b0054; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 1px; }
            .logo-sub { color: #00a651; font-size: 13px; font-weight: bold; margin: 5px 0 0 0; }
            .grid { display: grid; grid-template-columns: 1fr; gap: 12px; text-align: left; }
            .item { font-size: 16px; border-bottom: 1px dashed #eee; padding: 8px 0; display: flex; justify-content: space-between; }
            .label { font-weight: bold; color: #555; }
            .val { font-weight: 700; color: #2b0054; }
            .status-banner { background: #00a651; color: white; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 30px; display: inline-block; width: 100%; text-align: center; }
            .qr-area { margin-top: 25px; text-align: center; }
            .footer { margin-top: 25px; font-size: 11px; color: #888; text-align: center; }
        </style></head><body>
            <div class="slip-box">
                <div class="header">
                    <div class="logo-main">STUDENT CAREER CONSULTANCY</div>
                    <div class="logo-sub">OFFICIAL ADMISSION ACKNOWLEDGEMENT</div>
                </div>
                <div class="grid">
                    <div class="item"><span class="label">Student Name:</span> <span class="val">${name.toUpperCase()}</span></div>
                    <div class="item"><span class="label">Passport No:</span> <span class="val">${passport.toUpperCase()}</span></div>
                    <div class="item"><span class="label">University:</span> <span class="val">${uni}</span></div>
                    <div class="item"><span class="label">Partner ID:</span> <span class="val">${partnerID}</span></div>
                    <div class="item"><span class="label">Date:</span> <span class="val">${new Date().toLocaleDateString('en-GB')}</span></div>
                </div>
                <div class="status-banner">✓ VERIFIED & IN-HOUSE PROCESSING ENABLED</div>
                <div class="qr-area">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VALID-${passport}" width="100">
                    <p style="font-size:10px; margin-top:5px; font-weight:bold;">SCAN TO VERIFY STATUS</p>
                </div>
                <div class="footer">"Your Dream Route to Global Education" <br> © 2026 IHP Network Processing Hub</div>
            </div>
            <script>window.onload = function() { window.print(); }<\/script>
        </body></html>
    `);
    slipWin.document.close();
};

// --- ৬. সার্চ ও প্রোফাইল ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
}); 
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    if(modal) { document.getElementById('modalUniName').innerText = name; modal.style.display = 'flex'; }
}; 
document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const filtered = allUnis.filter(u => !country || u.uCountry.toLowerCase().includes(country)); 
    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr><td><b>${u.uName}</b></td><td>${u.uDegree}</td><td>${u.uLanguage}</td><td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td><td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td><td><button class="btn-gold" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td></tr>
    `).join('') || "<tr><td colspan='6'>No results</td></tr>";
};
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
