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

let globalFinalBalance = 0;

// --- ১. নেভিগেশন কন্ট্রোল ---
window.showTab = (id, el) => {
    // সব সেকশন হাইড করা
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active-section');
        s.style.display = 'none';
    });
    // মেনু স্টাইল রিসেট
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // টার্গেট শো করা
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active-section');
        target.style.display = 'block';
    }
    if(el) el.classList.add('active');
};

window.logout = () => { 
    if(confirm("Logout now?")) { localStorage.clear(); location.href='index.html'; }
};

window.closeModal = () => { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
};

// --- ২. Cloudinary আপলোড ---
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
        let pendingWallet = 0; let finalWallet = 0; let trackHtml = "";
        
        const docs = snap.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));

        docs.forEach(dSnap => {
            const d = dSnap.data();
            const comm = Number(d.commission || 0);
            if(d.commissionStatus === 'waiting' || d.commissionStatus === 'pending') pendingWallet += comm;
            else if(d.commissionStatus === 'ready') finalWallet += comm;
            
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            
            trackHtml += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.studentPhone || 'N/A'}</td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank"><i class="fas fa-file-pdf"></i></a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        document.getElementById('homeTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Data</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = trackHtml || "<tr><td colspan='6'>No Data</td></tr>";
        
        globalFinalBalance = finalWallet;
        document.getElementById('topPending').innerText = `৳${pendingWallet.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalWallet.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = finalWallet.toLocaleString();
    });
};
syncDashboard();

// --- ৪. ইউনিভার্সিটি সার্চ ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;

    const filtered = allUnis.filter(u => 
        (country === "" || u.uCountry.toLowerCase().includes(country)) &&
        (degree === "" || u.uDegree === degree) &&
        (gpa >= (parseFloat(u.minCGPA) || 0))
    );

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
    if(!sName || !sPass) return alert("Fill all fields!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "PROCESSING..."; btn.disabled = true;

    try {
        const u1 = await uploadToCloudinary(document.getElementById('fileAcad').files[0]);
        const u2 = await uploadToCloudinary(document.getElementById('filePass').files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: sName, studentPhone: document.getElementById('appSPhone').value,
            passportNo: sPass, university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm), partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', commissionStatus: 'waiting',
            docs: { academic: u1, passport: u2 }, createdAt: serverTimestamp()
        });
        
        // এখানে স্লিপ জেনারেশন ফাংশন কল করতে পারেন যেটা আপনার আগে ছিল
        alert("Enrollment Successful!");
        location.reload();
    } catch (e) { alert("Failed!"); btn.disabled = false; }
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
