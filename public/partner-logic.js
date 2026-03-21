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

// --- 1. Global Functions (Sidebar Unlock) ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- 2. Dashboard & Tracking Logic ---
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
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status.replace(/\s+/g, '-')}">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn-gold" style="padding:2px 8px; font-size:10px;" 
                        onclick="window.printSlip('${d.studentName}', '${d.passportNo}', '${d.university}')">
                        PRINT SLIP
                    </button>
                </td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody'); 
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5'>No Data</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5'>No Data</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
};
syncDashboard(); 

// --- 3. File Upload Logic (Fixed Undefined Error) ---
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

// --- 4. Submission & Print Logic (No Popup Error) ---
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
            university: window.selectedUni ? window.selectedUni.name : "N/A",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        alert("Success! Check tracking table to print slip.");
        window.closeModal();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

window.printSlip = (name, passport, uni) => {
    const slipWin = window.open('', '_blank');
    if (!slipWin) return alert("Please allow pop-ups to print.");

    slipWin.document.write(`
        <html><head><title>Slip - ${name}</title>
        <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; color: #333; }
            .card { border: 4px solid #2b0054; padding: 30px; border-radius: 20px; max-width: 550px; margin: auto; }
            .header { border-bottom: 3px solid #00a651; padding-bottom: 10px; margin-bottom: 25px; color: #2b0054; }
            .info { font-size: 18px; margin: 12px 0; text-align: left; }
            .status-box { background: #00a651; color: white; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 25px; display: inline-block; }
        </style></head><body>
            <div class="card">
                <div class="header"><h2>STUDENT CAREER CONSULTANCY</h2><p>Official Admission Slip</p></div>
                <div class="info">Full Name: <b>${name.toUpperCase()}</b></div>
                <div class="info">Passport No: <b>${passport.toUpperCase()}</b></div>
                <div class="info">University: <b>${uni}</b></div>
                <div class="status-box">✓ VERIFIED & IN-HOUSE PROCESSING</div>
                <div style="margin-top:20px;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${passport}"></div>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body></html>
    `);
    slipWin.document.close();
};

// --- 5. University Search ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
}); 

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    if(modal) {
        document.getElementById('modalUniName').innerText = name;
        modal.style.display = 'flex';
    }
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
