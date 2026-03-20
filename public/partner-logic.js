import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- ১. ট্যাব নেভিগেশন (Fixed Tab System) ---
window.showTab = (id, el) => {
    // সব সেকশন হাইড করা
    document.querySelectorAll('.section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active-section');
    });
    // সব মেনু থেকে একটিভ ক্লাস রিমুভ
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // নির্দিষ্ট সেকশন শো করা
    const target = document.getElementById(id);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active-section');
    }
    if(el) el.classList.add('active');
};

window.logout = () => { if(confirm("Confirm Logout?")) { localStorage.clear(); location.href='index.html'; }};
window.closeModal = () => { document.getElementById('applyModal').style.display='none'; };

// --- ২. ফাইল আপলোড ---
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

// --- ৩. ড্যাশবোর্ড ডাটা সিঙ্ক ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let trackHtml = "";
        const sorted = snap.docs.sort((a,b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

        sorted.forEach(dSnap => {
            const d = dSnap.data();
            const comm = Number(d.commission || 0);
            if(d.commissionStatus === 'pending') pending += comm;
            else if(d.commissionStatus === 'ready') final += comm;
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            trackHtml += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.studentPhone}</td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'SUBMITTED').toUpperCase()}</span></td>
                <td><a href="${d.docs?.passport || '#'}" target="_blank"><i class="fas fa-file-pdf"></i></a></td>
                <td>${dateStr}</td>
            </tr>`;
        });
        document.getElementById('homeTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Data</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Data</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- ৪. ইউনিভার্সিটি সার্চ ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => { allUnis = snap.docs.map(d => ({id: d.id, ...d.data()})); });

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const filtered = allUnis.filter(u => (country === "" || u.uCountry.toLowerCase().includes(country)) && (degree === "" || u.uDegree === degree));
    
    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+</td>
            <td>৳${(Number(u.uSemFee)*115).toLocaleString()}</td>
            <td style="color:var(--gold);">৳${Number(u.partnerComm).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6'>No Matches Found</td></tr>";
};

// --- ৫. এনরোলমেন্ট ও স্লিপ ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value;
    const sPhone = document.getElementById('appSPhone').value;
    if(!sName || !sPass) return alert("Student Name and Passport required!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        const u1 = await uploadToCloudinary(document.getElementById('fileAcad').files[0]);
        const u2 = await uploadToCloudinary(document.getElementById('filePass').files[0]);
        const u3 = await uploadToCloudinary(document.getElementById('fileLang').files[0]);
        const u4 = await uploadToCloudinary(document.getElementById('fileOther').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: sPhone, passportNo: sPass,
            university: window.selectedUni.name, commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(), status: 'submitted', commissionStatus: 'pending',
            docs: { academic: u1, passport: u2, language: u3, others: u4 },
            createdAt: serverTimestamp()
        });

        generateSlip({ sName, sPass, sPhone, uni: window.selectedUni.name, pAgency: document.getElementById('pAgency').value, pContact: document.getElementById('pContact').value, pAddress: document.getElementById('pAddress').value });
    } catch (e) { alert("Error uploading application!"); btn.disabled = false; btn.innerText = "CONFIRM ENROLLMENT"; }
};

function generateSlip(data) {
    const slipArea = document.getElementById('slipContent');
    const today = new Date().toLocaleDateString('en-GB');
    const trackingLink = `https://study-abroad-crm-nine.vercel.app/track.html?id=${data.sPass}`;

    slipArea.innerHTML = `
        <div style="padding:40px; border:2px solid #d4af37; font-family:sans-serif; background:white; color:black; max-width:700px; margin:auto;">
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid #d4af37; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="color:#d4af37; margin:0;">STUDENT CAREER CONSULTANCY</h2>
                <p>Date: ${today}</p>
            </div>
            <h3 style="text-align:center;">ACKNOWLEDGMENT SLIP</h3>
            <div style="margin:20px 0;">
                <p>Student Name: <b>${data.sName}</b></p>
                <p>Passport No: <b>${data.sPass}</b></p>
                <p>University: <b>${data.uni}</b></p>
            </div>
            <hr style="border:0; border-top:1px dashed #ccc;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                <div style="font-size:12px;">
                    <p>Scan to track your status live at:</p>
                    <b>study-abroad-crm-nine.vercel.app/track.html</b>
                </div>
                <div id="qrcode_box"></div>
            </div>
            <p style="text-align:center; margin-top:40px; font-size:10px; color:#888;">2026 @ All rights and reserved GORUN Ltd.</p>
        </div>
    `;

    setTimeout(() => {
        new QRCode(document.getElementById("qrcode_box"), { text: trackingLink, width: 90, height: 90 });
        setTimeout(() => { window.print(); location.reload(); }, 1200);
    }, 500);
}

document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pContact').value, 
        address: document.getElementById('pAddress').value 
    }, { merge: true });
    alert("Profile Saved!");
};
