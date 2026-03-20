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

// --- ২. ট্র্যাকিং টেবিল (লাইভ আপডেট ফিক্সড - ইনডেক্স ছাড়াই চলবে) ---
const syncDashboard = () => {
    // এখানে orderBy সরিয়ে ফেলা হয়েছে যাতে ইনডেক্স এরর না আসে
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let allDocs = [];

        snap.forEach(dSnap => {
            allDocs.push(dSnap.data());
        });

        // জাভাস্ক্রিপ্ট দিয়ে নতুন ডাটা উপরে দেখানোর ব্যবস্থা (Manual Sort)
        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        allDocs.forEach(d => {
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

// --- ৪. প্রফেশনাল স্লিপ (Students Career Consultancy Logo) ---
const writeSlipContent = (win, data) => {
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    win.document.write(`
        <html>
        <head>
            <title>Slip - ${data.studentName}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; }
                .slip { border: 2px solid #2b0054; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; position: relative; }
                .header { text-align: center; border-bottom: 2px solid #f1c40f; padding-bottom: 15px; margin-bottom: 20px; }
                .logo { font-size: 24px; font-weight: bold; color: #2b0054; }
                .tagline { font-size: 11px; color: #666; letter-spacing: 1px; }
                .details { font-size: 16px; line-height: 1.8; color: #333; }
                .details b { width: 140px; display: inline-block; color: #555; }
                .stamp { position: absolute; bottom: 40px; right: 40px; border: 3px solid #2ecc71; color: #2ecc71; padding: 5px 15px; transform: rotate(-10deg); font-weight: bold; opacity: 0.7; }
                .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #999; }
            </style>
        </head>
        <body>
            <div class="slip">
                <div class="header">
                    <div class="logo">STUDENTS CAREER CONSULTANCY</div>
                    <div class="tagline">YOUR TRUSTED GLOBAL EDUCATION PARTNER</div>
                </div>
                <div class="details">
                    <p><b>Student Name:</b> ${data.studentName}</p>
                    <p><b>Passport No:</b> ${data.passportNo}</p>
                    <p><b>University:</b> ${data.university}</p>
                    <p><b>Applied Date:</b> ${date}</p>
                </div>
                <div class="stamp">SUBMITTED</div>
                <div class="footer">Computer generated copy. No signature required.</div>
            </div>
            <script>window.print();<\/script>
        </body>
        </html>
    `);
    win.document.close();
};

// --- ৫. ফাইল আপলোড ও সাবমিট ---
const uploadFile = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
    if(!res.ok) throw new Error("File Upload Failed");
    const data = await res.json();
    return data.secure_url;
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value;
    const sPhone = document.getElementById('appSPhone').value;

    if(!sName || !sPass) return alert("Fill Name and Passport!");

    // পপ-আপ ব্লকার এড়াতে আগেই উইন্ডো ওপেন করা
    const slipWin = window.open('', '_blank');

    btn.innerText = "Uploading Documents..."; btn.disabled = true;

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

        await addDoc(collection(db, "applications"), appData);
        
        writeSlipContent(slipWin, appData);
        alert("Success! Check the new tab for your slip.");
        closeModal();
        
    } catch (e) {
        if(slipWin) slipWin.close();
        alert("Failed: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// প্রোফাইল সেভ
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
