import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, query, where, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const staffEmail = localStorage.getItem('userEmail');

// Global mappings
let staffNames = {};

// --- 1. Loader & Session Check ---
// যদি ইমেইল না থাকে তবে লগইন পেজে পাঠিয়ে দিবে
if (!staffEmail) {
    location.href = 'index.html';
}

const hideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
};

// --- 2. Top Bar Staff Name & Profile Logic ---
onSnapshot(doc(db, "staffs", staffEmail), (dSnap) => {
    const display = document.getElementById('staffDisplay');
    if (dSnap.exists()) {
        const d = dSnap.data();
        const name = d.name || staffEmail;
        if (display) display.innerText = name; 
        
        if (document.getElementById('profName')) document.getElementById('profName').value = d.name || "";
        if (document.getElementById('profOrg')) document.getElementById('profOrg').value = d.org || "";
        if (document.getElementById('profExp')) document.getElementById('profExp').value = d.exp || "";
        staffNames[staffEmail] = name;
    } else {
        if (display) display.innerText = staffEmail;
    }
    // প্রোফাইল চেক শেষ হলে লোডার সরিয়ে দিবে (যদি ডেটা আসার পর সরাতে চান)
    hideLoader(); 
});

// --- 3. Load Incoming Applications ---
onSnapshot(collection(db, "applications"), async (snap) => {
    try {
        const staffQuery = await getDocs(collection(db, "staffs"));
        staffQuery.forEach(sd => staffNames[sd.id] = sd.data().name || sd.id);

        const tbody = document.getElementById('incomingTableBody');
        if (!tbody) return;
        tbody.innerHTML = "";
        
        let totalServed = 0;
        let visaSuccess = 0;
        let partnersSet = new Set();

        snap.forEach(dSnap => {
            const d = dSnap.data();
            const id = dSnap.id;

            if(d.handledBy === staffEmail) {
                totalServed++;
                if(d.status === 'visa_success') visaSuccess++;
                partnersSet.add(d.partnerEmail);
            }

            const ds = d.docs || {};
            let docLinks = "";
            if(ds.academic) docLinks += `<a href="${ds.academic}" target="_blank" style="color:var(--accent); margin-right:8px;">[A]</a>`;
            if(ds.language) docLinks += `<a href="${ds.language}" target="_blank" style="color:var(--accent); margin-right:8px;">[L]</a>`;
            if(ds.passport) docLinks += `<a href="${ds.passport}" target="_blank" style="color:var(--accent); margin-right:8px;">[P]</a>`;
            if(ds.others) docLinks += `<a href="${ds.others}" target="_blank" style="color:var(--accent);">[O]</a>`;

            const handlerName = staffNames[d.handledBy] || d.handledBy || 'Unclaimed';

            tbody.innerHTML += `
                <tr>
                    <td><b>${d.studentName}</b><br><small>${d.partnerEmail || 'no-email'}</small></td>
                    <td>${d.passportNo}</td>
                    <td>${docLinks || 'No Files'}</td>
                    <td><span class="status-pill ${d.status}">${d.status.toUpperCase()}</span></td>
                    <td><i class="fas fa-user-check" style="font-size:10px;"></i> ${handlerName}</td>
                    <td><button class="btn-claim" onclick="openReview('${id}', '${d.studentName}', '${d.commission}')">Review</button></td>
                </tr>`;
        });

        if (document.getElementById('hTotal')) document.getElementById('hTotal').innerText = totalServed;
        if (document.getElementById('hSuccess')) document.getElementById('hSuccess').innerText = visaSuccess;
        if (document.getElementById('hPartners')) document.getElementById('hPartners').innerText = partnersSet.size;
        
    } catch (err) {
        console.error("Snapshot error:", err);
    }
    // ইনকামিং ডেটা আসার পরও একবার সেফটি চেক হিসেবে লোডার সরানো
    hideLoader();
});

// --- 4. Review Slider Functions (Global Binding) ---
window.openReview = async (id, sName, comm) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('targetComm').innerText = `Commission: ৳${Number(comm).toLocaleString()}`;
    
    const appSnap = await getDoc(doc(db, "applications", id));
    if (!appSnap.exists()) return;
    
    const d = appSnap.data().docs || {};
    const area = document.getElementById('docLinksArea');
    area.innerHTML = `
        <p style="font-size:12px; margin-bottom:10px; color:#aaa;">Review Documents:</p>
        <div style="display:flex; flex-wrap:wrap; gap:10px;">
            ${d.academic ? `<a href="${d.academic}" target="_blank" class="btn-gold" style="padding:10px; font-size:11px; text-decoration:none; background:var(--accent); color:black; border-radius:5px;">Academic Doc</a>` : ''}
            ${d.language ? `<a href="${d.language}" target="_blank" class="btn-gold" style="padding:10px; font-size:11px; text-decoration:none; background:var(--accent); color:black; border-radius:5px;">Language Doc</a>` : ''}
            ${d.passport ? `<a href="${d.passport}" target="_blank" class="btn-gold" style="padding:10px; font-size:11px; text-decoration:none; background:var(--accent); color:black; border-radius:5px;">Passport Copy</a>` : ''}
            ${d.others ? `<a href="${d.others}" target="_blank" class="btn-gold" style="padding:10px; font-size:11px; text-decoration:none; background:var(--accent); color:black; border-radius:5px;">Other File</a>` : ''}
        </div>
    `;

    document.getElementById('reviewSlider').classList.add('open');
};

window.closeSlider = () => {
    document.getElementById('reviewSlider').classList.remove('open');
};

// --- 5. Update Status Logic ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appRef = doc(db, "applications", window.currentAppId);
        
        updateBtn.innerText = "Processing..."; updateBtn.disabled = true;

        try {
            const appSnap = await getDoc(appRef);
            const appData = appSnap.data();
            let commStatus = appData.commissionStatus || "waiting";

            if (newStatus === "verified") commStatus = "pending";
            else if (newStatus === "student_paid") commStatus = "ready";
            else if (newStatus === "visa_rejected" || newStatus === "doc_missing") commStatus = "waiting";

            await updateDoc(appRef, {
                status: newStatus,
                commissionStatus: commStatus,
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            alert("Status & Wallet Updated!");
            closeSlider();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            updateBtn.innerText = "APPLY STATUS & SYNC WALLET"; updateBtn.disabled = false;
        }
    };
}

// --- 6. Profile Save ---
const saveProfBtn = document.getElementById('saveProfileBtn');
if (saveProfBtn) {
    saveProfBtn.onclick = async () => {
        await setDoc(doc(db, "staffs", staffEmail), {
            name: document.getElementById('profName').value,
            org: document.getElementById('profOrg').value,
            exp: document.getElementById('profExp').value,
            email: staffEmail
        }, { merge: true });
        alert("Profile Updated!");
    };
}

// --- 7. Logout ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        location.href = 'index.html';
    };
}

// Fallback: যদি ১ সেকেন্ডের মধ্যে কোনো ডেটা লোড না হয়, লোডার সরিয়ে দাও
setTimeout(hideLoader, 1500);
