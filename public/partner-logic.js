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

// --- ২. ডাটা সিঙ্ক ও ট্র্যাকিং (রিয়েল-টাইম ফিক্সড) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        snap.forEach(dSnap => {
            const d = dSnap.data();
            if(d.commissionStatus === 'ready') final += Number(d.commission || 0);
            else pending += Number(d.commission || 0);
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : 'Just now';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status || 'pending'}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;"><i class="fas fa-file-pdf"></i> View Docs</a></td>
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

// --- ৪. প্রফেশনাল স্লিপ কন্টেন্ট ---
const writeSlipContent = (win, data) => {
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    win.document.write(`
        <html>
        <head>
            <title>Acknowledgment - ${data.studentName}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f0f0f0; }
                .slip { background: white; padding: 30px; border-top: 8px solid #2b0054; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 700px; margin: auto; }
                .header { text-align: center; border-bottom: 2px solid #f1c40f; padding-bottom: 20px; }
                .logo { font-size: 26px; font-weight: bold; color: #2b0054; }
                .tagline { font-size: 12px; color: #666; letter-spacing: 2px; }
                .title { font-size: 20px; color: #f1c40f; margin-top: 15px; font-weight: bold; }
                .details { margin-top: 30px; font-size: 16px; line-height: 2; color: #333; }
                .details b { width: 150px; display: inline-block; color: #555; }
                .stamp { margin-top: 30px; border: 3px solid #2ecc71; color: #2ecc71; display: inline-block; padding: 10px 25px; transform: rotate(-10deg); font-weight: bold; font-size: 24px; border-radius: 5px; opacity: 0.8; }
                .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="slip">
                <div class="header">
                    <div class="logo">STUDENTS CAREER CONSULTANCY</div>
                    <div class="tagline">YOUR TRUSTED GLOBAL EDUCATION PARTNER</div>
                    <div class="title">ADMISSION ACKNOWLEDGMENT SLIP</div>
                </div>
                <div class="details">
                    <p><b>Student Name:</b> ${data.studentName}</p>
                    <p><b>Passport No:</b> ${data.passportNo}</p>
                    <p><b>University:</b> ${data.university}</p>
                    <p><b>Submission Date:</b> ${date}</p>
                    <p><b>Partner Email:</b> ${data.partnerEmail}</p>
                </div>
                <div style="text-align: right;"><div class="stamp">SUCCESSFUL</div></div>
                <div class="footer">
                    This is an electronically generated document. No signature is required.<br>
                    © 2026 Students Career Consultancy. All Rights Reserved.
                </div>
            </div>
            <script>setTimeout(() => { window.print(); }, 500);<\/script>
        </body>
        </html>
    `);
    win.document.close();
};

// --- ৫. সাবমিট লজিক (Pop-up & Live Table Fix) ---
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
    if(!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.secure_url;
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value;
    const sPhone = document.getElementById('appSPhone').value;

    if(!sName || !sPass) return alert("Student Name and Passport required!");

    // পপ-আপ ব্লকার এড়াতে আগেই উইন্ডো ওপেন করা
    const slipWin = window.open('', '_blank');

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

        // ডাটাবেসে সেভ হওয়া পর্যন্ত অপেক্ষা
        await addDoc(collection(db, "applications"), appData);

        // স্লিপ কন্টেন্ট রাইট করা
        writeSlipContent(slipWin, appData);
        
        alert("Application Submitted Successfully!");
        closeModal();
        
        // ফর্ম ক্লিয়ার
        document.getElementById('appSName').value = "";
        document.getElementById('appSPass').value = "";
        document.getElementById('appSPhone').value = "";
        
    } catch (e) {
        if(slipWin) slipWin.close();
        alert("Upload Failed. Please check internet or file size (Max 5MB).");
        console.error(e);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// প্রোফাইল আপডেট
document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pAgency').value, // contact input id fixed
        address: document.getElementById('pAddress').value 
    }, { merge: true });
    alert("Profile Saved!");
};

onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner';
});
