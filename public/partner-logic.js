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

// --- ১. গ্লোবাল ফাংশনস (Safe & Original) ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. ওয়ালেট ও ট্র্যাকিং লজিক (Safe & Original) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pending = 0; 
        let final = 0; 
        let html = "";
        let allDocs = []; 

        snap.forEach(dSnap => {
            const d = dSnap.data();
            allDocs.push(d); 
            const comm = Number(d.commission || 0);
            const currentStatus = (d.status || "").toLowerCase().trim(); 

            if (currentStatus === 'visa rejected') return; 

            if (currentStatus === 'student paid to uni') {
                final += comm;
            } 
            else if (currentStatus === 'verified') {
                pending += comm;
            }
        }); 

        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); 

        allDocs.forEach(d => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        const homeT = document.getElementById('homeTrackingBody');
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        
        const withdrawEl = document.getElementById('withdrawFinalBalance');
        if(withdrawEl) withdrawEl.innerText = final.toLocaleString();
    });
};
syncDashboard(); 

// --- ৩. সার্চ ও এপ্লাই বাটন (Safe & Original) ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
}); 

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    const uniLabel = document.getElementById('modalUniName');
    if(modal && uniLabel) {
        uniLabel.innerText = name;
        modal.style.display = 'flex';
    }
}; 

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const filtered = allUnis.filter(u => country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country))); 

    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | ${u.uLanguage}</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" style="padding:5px 10px;" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6' align='center'>No matches found.</td></tr>";
}; 

// --- ৪. সাবমিট অ্যাপ্লিকেশন ও ফাইল আপলোড (Enhanced Slip Integration) ---
const uploadFile = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}; 

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 

    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    // Create new tab immediately to prevent popup blocking
    const slipWin = window.open('', '_blank');
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
        
        // --- PREMIUM SLIP GENERATION (Does NOT affect Dashboard Design) ---
        const qrLink = `https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrLink)}`;
        const dateStr = new Date().toLocaleDateString('en-GB');

        slipWin.document.write(`
            <html>
            <head>
                <title>Submission Slip - SCC</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f4f7f6; color: #333; }
                    .container { background: #fff; border: 2px solid #2b0054; border-radius: 12px; padding: 30px; max-width: 600px; margin: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #2b0054; }
                    .status { background: #2ecc71; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    .content p { margin: 12px 0; font-size: 16px; }
                    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
                    .qr-section { text-align: center; font-size: 11px; }
                    @media print { .no-print { display: none; } body { background: #fff; padding: 0; } .container { border: none; box-shadow: none; width: 100%; max-width: 100%; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SCC HUB</div>
                        <div class="status">SUBMITTED</div>
                    </div>
                    <div class="content">
                        <p><b>Date:</b> ${dateStr}</p>
                        <p><b>Student Name:</b> ${sName.toUpperCase()}</p>
                        <p><b>Passport No:</b> ${sPass.toUpperCase()}</p>
                        <p><b>University:</b> ${window.selectedUni.name}</p>
                    </div>
                    <div class="footer">
                        <div>
                            <div style="width: 130px; border-top: 1px solid #000; margin-bottom: 5px;"></div>
                            <p style="font-size: 12px;">Authorized Signature</p>
                        </div>
                        <div class="qr-section">
                            <img src="${qrImg}" alt="QR"><br>
                            Scan to Track Status
                        </div>
                    </div>
                    <button onclick="window.print()" class="no-print" style="margin-top:25px; width: 100%; padding: 12px; background: #2b0054; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">PRINT / SAVE PDF</button>
                </div>
            </body>
            </html>
        `);
        slipWin.document.close(); 

        closeModal();
    } catch (e) {
        if(slipWin) slipWin.close();
        alert("Upload Failed: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
}; 

// --- ৫. প্রোফাইল নেম আপডেট (Safe & Original) ---
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
