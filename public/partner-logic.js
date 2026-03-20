import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

window.logout = () => { if(confirm("Logout?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); };

// --- ২. ড্যাশবোর্ড ডাটা সিঙ্ক ---
let globalFinalBalance = 0;
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        const docs = snap.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

        docs.forEach(dSnap => {
            const d = dSnap.data();
            if(d.commissionStatus === 'waiting' || d.commissionStatus === 'pending') pending += Number(d.commission || 0);
            else if(d.commissionStatus === 'ready') final += Number(d.commission || 0);
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status || 'pending'}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank">📄</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5'>No Applications</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = html || "<tr><td colspan='5'>No Applications</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
        globalFinalBalance = final;
    });
};
syncDashboard();

// --- ৩. ইউনিভার্সিটি সার্চ (Assessment) ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLanguage').value;
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;

    const filtered = allUnis.filter(u => 
        (country === "" || u.uCountry.toLowerCase().includes(country)) &&
        (degree === "" || u.uDegree === degree) &&
        (lang === "" || u.uLanguage === lang) &&
        (gpa >= (parseFloat(u.minCGPA) || 0))
    );

    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | ${u.uLanguage || 'IELTS'}</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:#f1c40f;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6'>No Universities Found</td></tr>";
};

// --- ৪. এপ্লাই ও ফাইল আপলোড ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

const uploadToCloudinary = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url || "";
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        const u1 = await uploadToCloudinary(document.getElementById('fileAcad').files[0]);
        const u2 = await uploadToCloudinary(document.getElementById('filePass').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: document.getElementById('appSName').value,
            studentPhone: document.getElementById('appSPhone').value,
            passportNo: document.getElementById('appSPass').value,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted',
            commissionStatus: 'waiting',
            docs: { academic: u1, passport: u2 },
            createdAt: serverTimestamp()
        });
        alert("Enrolled!"); location.reload();
    } catch (e) { alert("Error!"); btn.disabled = false; }
};

// --- ৫. উইথড্রয়াল লজিক ---
window.openWithdrawModal = () => {
    if(globalFinalBalance <= 0) return alert("Insufficient Balance!");
    document.getElementById('withdrawModal').style.display = 'flex';
};

document.getElementById('confirmWdBtn').onclick = async () => {
    const amount = Number(document.getElementById('wdReqAmount').value);
    if(amount > globalFinalBalance || amount < 500) return alert("Invalid Amount (Min ৳500)");

    await addDoc(collection(db, "payouts"), {
        partnerEmail: userEmail.toLowerCase(),
        amount: amount,
        method: document.getElementById('wdMethod').value,
        details: document.getElementById('wdAccountDetails').value,
        status: 'pending',
        createdAt: serverTimestamp()
    });
    alert("Withdraw Request Sent!");
    closeModal();
};

// প্রোফাইল সেভ
document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pContact').value, 
        address: document.getElementById('pAddress').value 
    }, { merge: true });
    alert("Profile Updated!");
};
