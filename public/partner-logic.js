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

// প্রোটেকশন চেক
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
let globalFinalBalance = 0;
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        snap.forEach(dSnap => {
            const d = dSnap.data();
            // কমিশন হিসাব
            if(d.commissionStatus === 'ready') final += Number(d.commission || 0);
            else if(d.commissionStatus === 'waiting' || d.commissionStatus === 'pending') pending += Number(d.commission || 0);
            
            // টেবিল রো তৈরি
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
        globalFinalBalance = final;
    });
};
syncDashboard();

// --- ৩. স্মার্ট ইউনিভার্সিটি সার্চ (Assessment) ---
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

    const resultArea = document.getElementById('searchResultArea');
    const container = document.getElementById('uniListContainer');
    
    resultArea.style.display = 'block';
    if (filtered.length > 0) {
        container.innerHTML = filtered.map(u => `
            <tr>
                <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
                <td>${u.uDegree}</td>
                <td>GPA ${u.minCGPA}+ | ${u.uLanguage} (${u.uScore})</td>
                <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
                <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
                <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
            </tr>
        `).join('');
    } else {
        container.innerHTML = "<tr><td colspan='6' align='center' style='padding:20px; color:#ff4757;'>No universities match your criteria.</td></tr>";
    }
};

// --- ৪. এপ্লাই প্রসেসিং (Cloudinary Upload সহ) ---
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
    btn.innerText = "Processing Files..."; btn.disabled = true;

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: document.getElementById('appSName').value,
            studentPhone: document.getElementById('appSPhone').value,
            passportNo: document.getElementById('appSPass').value,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted',
            commissionStatus: 'waiting',
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        });

        alert("Application Submitted Successfully!");
        location.reload();
    } catch (e) {
        alert("Upload Failed. Check internet or file size.");
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// --- ৫. প্রোফাইল ও উইথড্রয়াল ---
document.getElementById('saveProfileBtn').onclick = async () => {
    const pData = {
        agencyName: document.getElementById('pAgency').value,
        contact: document.getElementById('pContact').value,
        address: document.getElementById('pAddress').value
    };
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), pData, { merge: true });
    alert("Profile Saved!");
};

// ওয়েলকাম নেম লোড
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner';
});
