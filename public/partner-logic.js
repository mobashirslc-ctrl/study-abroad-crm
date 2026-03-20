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

let globalFinalBalance = 0;

// --- ১. সাইডবার নেভিগেশন (Fixed for Sidebar Click) ---
window.showTab = (id, el) => {
    // সব সেকশন হাইড করা
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // টার্গেট সেকশন শো করা
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
    if(el) el.classList.add('active');
};

window.logout = () => { 
    if(confirm("Are you sure?")) {
        localStorage.clear(); 
        location.href='index.html'; 
    }
};

window.closeModal = () => { 
    document.getElementById('applyModal').style.display='none'; 
    document.getElementById('withdrawModal').style.display='none';
};

// --- ২. ফাইল আপলোড (Cloudinary) ---
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

// --- ৩. রিয়েল-টাইম ব্যালেন্স ও ট্র্যাকিং সিঙ্ক ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pendingWallet = 0; 
        let finalWallet = 0; 
        let trackHtml = "";

        // সর্টিং (লেটেস্ট ফাইল উপরে)
        const sortedDocs = snap.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

        sortedDocs.forEach(dSnap => {
            const d = dSnap.data();
            const comm = Number(d.commission || 0);
            
            if(d.commissionStatus === 'pending') pendingWallet += comm;
            else if(d.commissionStatus === 'ready') finalWallet += comm;
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            
            // ৪টি ফাইলের ভিউ আইকন লজিক
            const docIcons = `
                <div style="display:flex; gap:8px; justify-content:center;">
                    ${d.docs?.academic ? `<a href="${d.docs.academic}" target="_blank"><i class="fas fa-file-pdf" style="color:#00d2ff;"></i></a>` : ''}
                    ${d.docs?.passport ? `<a href="${d.docs.passport}" target="_blank"><i class="fas fa-file-invoice" style="color:#00d2ff;"></i></a>` : ''}
                    ${d.docs?.language ? `<a href="${d.docs.language}" target="_blank"><i class="fas fa-certificate" style="color:#00d2ff;"></i></a>` : ''}
                    ${d.docs?.others ? `<a href="${d.docs.others}" target="_blank"><i class="fas fa-folder-plus" style="color:#00d2ff;"></i></a>` : ''}
                </div>`;

            trackHtml += `
                <tr>
                    <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                    <td>${d.studentPhone || 'N/A'}</td>
                    <td>${d.passportNo || 'N/A'}</td>
                    <td><span class="status-pill ${d.status}">${(d.status || 'SUBMITTED').toUpperCase()}</span></td>
                    <td>${docIcons}</td>
                    <td>${dateStr}</td>
                </tr>`;
        });

        // UI আপডেট
        document.getElementById('homeTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Applications</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Applications</td></tr>";
        
        globalFinalBalance = finalWallet;
        document.getElementById('topPending').innerText = `৳${pendingWallet.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalWallet.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = finalWallet.toLocaleString();
    });
};
syncDashboard();

// --- ৪. ইউনিভার্সিটি সার্চিং ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const langScore = parseFloat(document.getElementById('fLangScore').value) || 0;
    const degree = document.getElementById('fDegree').value;

    const filtered = allUnis.filter(u => {
        return (country === "" || (u.uCountry || "").toLowerCase().includes(country)) &&
               (degree === "" || u.uDegree === degree) &&
               (gpa >= (parseFloat(u.minCGPA) || 0)) && 
               (langScore >= (parseFloat(u.minIELTS) || 0));
    });
    
    const container = document.getElementById('uniListContainer');
    document.getElementById('searchResultArea').style.display = 'block';
    container.innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>`).join('') || "<tr><td colspan='6'>No Matches</td></tr>";
};

// --- ৫. এনরোলমেন্ট লজিক ---
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
};

document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('appSName').value;
    const sPhone = document.getElementById('appSPhone').value;
    const sPass = document.getElementById('appSPass').value;
    if(!sName || !sPass) return alert("Required fields missing!");
    
    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "UPLOADING..."; btn.disabled = true;

    try {
        const u1 = await uploadToCloudinary(document.getElementById('fileAcad').files[0]);
        const u2 = await uploadToCloudinary(document.getElementById('fileLang').files[0]);
        const u3 = await uploadToCloudinary(document.getElementById('filePass').files[0]);
        const u4 = await uploadToCloudinary(document.getElementById('fileOther').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: sPhone, passportNo: sPass,
            university: window.selectedUni.name, commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(), status: 'submitted', commissionStatus: 'waiting',
            docs: { academic: u1, language: u2, passport: u3, others: u4 },
            createdAt: serverTimestamp()
        });
        alert("Enrolled Successfully!");
        window.closeModal();
    } catch (e) { alert("Error!"); btn.disabled = false; btn.innerText = "CONFIRM ENROLLMENT"; }
};

// --- ৬. প্রোফাইল ও উইথড্র ---
document.getElementById('wdBtn').onclick = () => {
    document.getElementById('wdAvailableText').innerText = `Available for Withdraw: ৳${globalFinalBalance.toLocaleString()}`;
    document.getElementById('withdrawModal').style.display = 'flex';
};

document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "partners", userEmail.toLowerCase()), { 
        agencyName: document.getElementById('pAgency').value, 
        contact: document.getElementById('pContact').value, 
        address: document.getElementById('pAddress').value 
    }, { merge: true });
    alert("Profile Saved!");
};

// ইনিশিয়াল নাম লোড
onSnapshot(collection(db, "users"), (snap) => {
    snap.forEach(uDoc => {
        if(uDoc.data().email?.toLowerCase() === userEmail.toLowerCase()) {
            document.getElementById('welcomeName').innerText = uDoc.data().fullName || "Partner";
        }
    });
});
