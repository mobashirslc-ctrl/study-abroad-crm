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

// --- ১. গ্লোবাল মেনু ফাংশনস (Sidebar Unlock করার জন্য) ---
window.showTab = (id, el) => {
    // সব সেকশন হাইড করা
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    // সব মেনু আইটেম থেকে একটিভ ক্লাস সরানো
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active-section');
        // যদি ডাটা ট্র্যাকিং পেজ হয়, তবে টেবিল রিফ্রেশ হতে পারে
        console.log(`Switched to: ${id}`);
    }
    if(el) el.classList.add('active');
};

window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }; 

// --- ২. ওয়ালেট ও ট্র্যাকিং লজিক (Live Updates) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let allDocs = []; 

        snap.forEach(dSnap => {
            const d = dSnap.data();
            allDocs.push(d); 

            const comm = Number(d.commission || 0);
            const currentStatus = (d.status || "").toLowerCase().trim(); 

            if (currentStatus === 'visa rejected') return; 

            if (currentStatus === 'student paid to uni') {
                final += comm;
            } else if (currentStatus === 'verified') {
                pending += comm;
            }
        }); 

        // সর্টিং: নতুন ফাইল সবার উপরে
        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); 

        allDocs.forEach(d => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : 'Processing...';
            const statusClass = (d.status || 'submitted').toLowerCase().replace(/\s+/g, '-');
            
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${statusClass}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        // ড্যাশবোর্ড এবং ট্র্যাকিং টেবিল আপডেট
        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody');
        
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        
        const withdrawEl = document.getElementById('withdrawFinalBalance');
        if(withdrawEl) withdrawEl.innerText = final.toLocaleString();
    });
};
syncDashboard(); 

// --- ৩. ইউনিভার্সিটি সার্চ লজিক ---
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

// --- ৪. ফাইল আপলোড ও সাবমিট ---
const uploadFile = async (file) => {
    if (!file) return "No File";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "No File";
    } catch (e) { return "No File"; }
}; 

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 

    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    btn.innerText = "Uploading Files..."; btn.disabled = true; 

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]); 

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

        await addDoc(collection(db, "applications"), appData);
        
        // --- Premium Slip Generation ---
        const slipWin = window.open('', '_blank');
        slipWin.document.write(`
            <html><head><title>Slip - ${sName}</title>
            <style>
                body { font-family: sans-serif; padding: 30px; line-height: 1.6; color: #333; }
                .slip { border: 2px solid #2b0054; padding: 20px; border-radius: 15px; max-width: 600px; margin: auto; }
                .header { border-bottom: 2px solid #00a651; padding-bottom: 10px; margin-bottom: 20px; text-align: center; color: #2b0054; }
                .detail { margin-bottom: 10px; font-size: 16px; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; font-weight: bold; color: #00a651; }
            </style></head><body>
                <div class="slip">
                    <div class="header"><h2>STUDENT CAREER CONSULTANCY</h2><p>Official Submission Slip</p></div>
                    <div class="detail">Student Name: <b>${sName.toUpperCase()}</b></div>
                    <div class="detail">Passport No: <b>${sPass.toUpperCase()}</b></div>
                    <div class="detail">Applied University: <b>${appData.university}</b></div>
                    <div class="detail">Date: <b>${new Date().toLocaleDateString()}</b></div>
                    <div class="footer">✓ VERIFIED & PROCESSED BY IHP NETWORK</div>
                </div>
                <script>window.print();<\/script>
            </body></html>
        `);
        slipWin.document.close();

        alert("Success! Application submitted and Slip generated.");
        closeModal();
    } catch (e) {
        alert("System Error: " + e.message);
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
