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

// --- ১. গ্লোবাল মেনু ও সাইডবার লজিক (নিশ্চিতভাবে উইন্ডো স্কোপে রাখা হয়েছে) ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};

window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. লাইভ ড্যাশবোর্ড ও ট্র্যাকিং ---
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
    });
};
syncDashboard(); 

// --- ৩. ফাইল আপলোড লজিক (Safe String Return) ---
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

// --- ৪. এরর-ফ্রি সাবমিশন ও স্লিপ জেনারেশন ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 
    
    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    btn.innerText = "Processing..."; btn.disabled = true; 

    try {
        const acadInput = document.getElementById('fileAcad');
        const passInput = document.getElementById('filePass');

        // ফাইল আপলোড (Undefined/Null Check সহ)
        const acadUrl = (acadInput && acadInput.files.length > 0) ? await uploadFile(acadInput.files[0]) : "No File";
        const passUrl = (passInput && passInput.files.length > 0) ? await uploadFile(passInput.files[0]) : "No File"; 

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

        // ডাটাবেসে সেভ
        await addDoc(collection(db, "applications"), appData);
        
        // স্লিপ উইন্ডো (Null Document Error Fix)
        const slipWin = window.open('', '_blank');
        if (!slipWin) {
            alert("Success! Please allow pop-ups to see your slip.");
        } else {
            const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://crm-nine.vercel.app/track.html?passport=${sPass}`;
            slipWin.document.write(`
                <html><head><title>Slip - ${sName}</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 40px; }
                    .card { border: 3px solid #2b0054; padding: 20px; border-radius: 10px; max-width: 500px; margin: auto; }
                    .header { color: #2b0054; margin-bottom: 20px; }
                    .status { background: #00a651; color: white; padding: 10px; border-radius: 5px; font-weight: bold; }
                </style></head><body>
                    <div class="card">
                        <div class="header"><h1>SCC ADMISSION SLIP</h1></div>
                        <p>Student: <b>${sName.toUpperCase()}</b></p>
                        <p>Passport: <b>${sPass.toUpperCase()}</b></p>
                        <p>University: <b>${appData.university}</b></p>
                        <br><img src="${qrImg}" width="100"><br>
                        <p class="status">✓ VERIFIED & IN-HOUSE PROCESSING</p>
                    </div>
                    <script>window.onload = function() { window.print(); }<\/script>
                </body></html>
            `);
            slipWin.document.close();
        }

        alert("Application Submitted Successfully!");
        window.closeModal();
    } catch (e) {
        alert("Critical Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// --- ৫. ইউনিভার্সিটি ও প্রোফাইল আপডেট ---
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
        <tr><td><b>${u.uName}</b></td><td>${u.uDegree}</td><td>${u.uLanguage}</td><td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td><td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td><td><button class="btn-gold" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td></tr>
    `).join('') || "<tr><td colspan='6' align='center'>No matches found.</td></tr>";
};

onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
