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

// --- ২. ডাটা সিঙ্ক ও ট্র্যাকিং (Real-time) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        snap.forEach(dSnap => {
            const d = dSnap.data();
            if(d.commissionStatus === 'ready') final += Number(d.commission || 0);
            else pending += Number(d.commission || 0);
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status || 'pending'}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold);"><i class="fas fa-file-pdf"></i> View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Yet</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Yet</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- ৩. সার্চ ফিল্টার ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLanguage').value;
    const gpaInput = parseFloat(document.getElementById('fGPA').value) || 0;
    const scoreInput = parseFloat(document.getElementById('fLangScore').value) || 0;

    const filtered = allUnis.filter(u => {
        const matchCountry = country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country));
        const matchDegree = degree === "" || u.uDegree === degree;
        const matchLang = lang === "" || u.uLanguage === lang;
        const matchGPA = gpaInput >= (parseFloat(u.minCGPA) || 0);
        const matchScore = scoreInput >= (parseFloat(u.uScore) || 0);
        return matchCountry && matchDegree && matchLang && matchGPA && matchScore;
    });

    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | ${u.uLanguage} (${u.uScore})</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6' align='center' style='padding:20px; color:#ff4757;'>No matches found.</td></tr>";
};

// --- ৪. স্লিপ জেনারেশন ফাংশন ---
const generateSlip = (data) => {
    const slipWindow = window.open('', '_blank');
    slipWindow.document.write(`
        <html>
        <head>
            <title>Submission Slip - ${data.studentName}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #f1c40f; padding-bottom: 20px; }
                .logo { font-size: 24px; font-weight: bold; color: #2b0054; }
                .details { margin-top: 30px; line-height: 1.8; }
                .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
                .stamp { border: 2px solid #2ecc71; color: #2ecc71; display: inline-block; padding: 5px 15px; transform: rotate(-5deg); font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">SCC GLOBAL ADMISSION PORTAL</div>
                <h3>Acknowledgment Slip</h3>
            </div>
            <div class="details">
                <p><strong>Student Name:</strong> ${data.studentName}</p>
                <p><strong>Passport No:</strong> ${data.passportNo}</p>
                <p><strong>University:</strong> ${data.university}</p>
                <p><strong>Applied By:</strong> ${data.partnerEmail}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <div class="stamp">SUBMITTED</div>
            </div>
            <div class="footer">
                This is a computer-generated slip. No signature required.
            </div>
            <script>window.print();<\/script>
        </body>
        </html>
    `);
    slipWindow.document.close();
};

// --- ৫. ফাইল আপলোড ও অ্যাপ্লিকেশন সাবমিট ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

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
    const sPhone = document.getElementById('appSPhone').value;

    if(!sName || !sPass) return alert("Student Name and Passport required!");

    btn.innerText = "Processing Files..."; btn.disabled = true;

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]);

        const appData = {
            studentName: sName,
            studentPhone: sPhone,
            passportNo: sPass,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted',
            commissionStatus: 'waiting',
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        };

        // ডাটাবেসে সেভ হওয়া পর্যন্ত অপেক্ষা করা
        await addDoc(collection(db, "applications"), appData);

        alert("Application Submitted Successfully!");
        
        // স্লিপ জেনারেট করা
        generateSlip(appData);
        
        // ফর্ম ক্লিয়ার ও ক্লোজ করা
        closeModal();
        document.getElementById('appSName').value = "";
        document.getElementById('appSPass').value = "";
        document.getElementById('appSPhone').value = "";
        
    } catch (e) {
        alert("Upload Failed. Check internet or file size.");
        console.error(e);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// প্রোফাইল ও ওয়েলকাম নেম
document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pContact').value, 
        address: document.getElementById('pAddress').value 
    }, { merge: true });
    alert("Profile Saved!");
};

onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner';
});
