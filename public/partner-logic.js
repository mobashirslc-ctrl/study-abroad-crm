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

// --- ২. ওয়ালেট ও ট্র্যাকিং লজিক (Updated: Pending to Final Movement) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pending = 0; 
        let final = 0; 
        let html = "";
        let allDocs = [];

        snap.forEach(dSnap => {
            const d = dSnap.data();
            allDocs.push(d);

            const comm = Number(d.commission || 0);
            // স্ট্যাটাসকে ছোট হাতের অক্ষরে এবং স্পেস সরিয়ে চেক করা (নিখুঁত ক্যালকুলেশনের জন্য)
            const currentStatus = (d.status || "").toLowerCase().trim();

            // শর্ত ৩: যদি ভিসা রিজেক্ট হয়, তবে কোনো বক্সেই যোগ হবে না
            if (currentStatus === 'visa rejected') return;

            // শর্ত ২: স্টুডেন্ট পে করলে পেন্ডিং থেকে মাইনাস হয়ে ফাইনালে আসবে
            if (currentStatus === 'student paid to uni') {
                final += comm;
            } 
            // শর্ত ১: শুধুমাত্র ভেরিফাইড হলে পেন্ডিং বক্সে দেখাবে
            else if (currentStatus === 'verified') {
                pending += comm;
            }
        });

        // নতুন ডাটা উপরে দেখানোর জন্য সর্টিং
        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        allDocs.forEach(d => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        // UI আপডেট
        const homeT = document.getElementById('homeTrackingBody');
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        
        const withdrawEl = document.getElementById('withdrawFinalBalance');
        if(withdrawEl) withdrawEl.innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- ৩. সার্চ ও এপ্লাই বাটন ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    const uniLabel = document.getElementById('modalUniName');
    if(modal && uniLabel) {
        uniLabel.innerText = name;
        modal.style.display = 'flex';
    }
};

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const filtered = allUnis.filter(u => country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country)));

    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | ${u.uLanguage}</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" style="padding:5px 10px;" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6' align='center'>No matches found.</td></tr>";
};

// --- ৪. সাবমিট অ্যাপ্লিকেশন ও ফাইল আপলোড ---
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

    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    const slipWin = window.open('', '_blank');
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]);

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "applications"), appData);
        
        // স্লিপ জেনারেশন
        slipWin.document.write(`<html><body style="font-family:sans-serif;padding:20px;border:2px solid #2b0054;border-radius:10px;"><h2>SCC - SUBMITTED</h2><hr><p><b>Student:</b> ${sName}</p><p><b>Passport:</b> ${sPass}</p><script>window.print();<\/script></body></html>`);
        slipWin.document.close();

        alert("Success! Slip generated in new tab.");
        closeModal();
    } catch (e) {
        if(slipWin) slipWin.close();
        alert("Upload Failed: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// --- ৫. প্রোফাইল নেম আপডেট ---
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) {
        const nameEl = document.getElementById('welcomeName');
        if(nameEl) nameEl.innerText = d.data().fullName || 'Partner';
    }
});
