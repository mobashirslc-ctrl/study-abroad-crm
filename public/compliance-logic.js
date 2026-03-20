import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- Loader Logic ---
window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
});

// --- 1. Load Incoming Applications & History Stats ---
onSnapshot(collection(db, "applications"), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    tbody.innerHTML = "";
    
    let totalServed = 0;
    let visaSuccess = 0;
    let partnersSet = new Set();

    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;

        // Statistics Calculation (Only for this staff)
        if(d.handledBy === staffEmail) {
            totalServed++;
            if(d.status === 'visa_success') visaSuccess++;
            partnersSet.add(d.partnerEmail);
        }

        // Table Rendering
        const ds = d.docs || {};
        let docBtn = "";
        if(ds.academic) docBtn += `<a href="${ds.academic}" target="_blank" style="color:var(--accent); margin-right:5px;">[Acad]</a>`;
        if(ds.passport) docBtn += `<a href="${ds.passport}" target="_blank" style="color:var(--accent);">[Pass]</a>`;

        tbody.innerHTML += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo}</td>
                <td>${docBtn || 'No Files'}</td>
                <td><span class="status-pill ${d.status}">${d.status.toUpperCase()}</span></td>
                <td>${d.handledBy || '<span style="color:#888;">Unclaimed</span>'}</td>
                <td><button class="btn-claim" onclick="openReview('${id}', '${d.studentName}', '${d.commission}')">Review</button></td>
            </tr>`;
    });

    // Update Stats UI
    document.getElementById('hTotal').innerText = totalServed;
    document.getElementById('hSuccess').innerText = visaSuccess;
    document.getElementById('hPartners').innerText = partnersSet.size;
});

// --- 2. Review Slider Logic ---
window.openReview = (id, sName, comm) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('targetComm').innerText = `Partner Commission: ৳${Number(comm).toLocaleString()}`;
    document.getElementById('reviewSlider').classList.add('open');
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('open');

// --- 3. Status Update & Wallet Sync (CRITICAL) ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const appRef = doc(db, "applications", window.currentAppId);
    
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        const appSnap = await getDoc(appRef);
        const appData = appSnap.data();
        let commStatus = appData.commissionStatus || "waiting";

        // Logic based on status selection
        if (newStatus === "verified") {
            commStatus = "pending"; // Adds to partner's pending wallet
        } else if (newStatus === "student_paid") {
            commStatus = "ready"; // Moves to partner's final balance
        } else if (newStatus === "visa_rejected" || newStatus === "doc_missing") {
            commStatus = "waiting"; // Removes from wallet
        }

        await updateDoc(appRef, {
            status: newStatus,
            commissionStatus: commStatus,
            handledBy: staffEmail,
            updatedAt: serverTimestamp()
        });

        alert("Application Status & Wallet Updated!");
        closeSlider();
    } catch (e) {
        alert("Sync Error!");
    } finally {
        btn.innerText = "APPLY STATUS & SYNC WALLET"; btn.disabled = false;
    }
};

// --- 4. Staff Profile Management ---
onSnapshot(doc(db, "staffs", staffEmail), (dSnap) => {
    if (dSnap.exists()) {
        const d = dSnap.data();
        document.getElementById('staffDisplay').innerText = d.name || staffEmail;
        document.getElementById('profName').value = d.name || "";
        document.getElementById('profOrg').value = d.org || "";
        document.getElementById('profExp').value = d.exp || "";
    } else {
        document.getElementById('staffDisplay').innerText = staffEmail;
    }
});

document.getElementById('saveProfileBtn').onclick = async () => {
    const name = document.getElementById('profName').value;
    const org = document.getElementById('profOrg').value;
    const exp = document.getElementById('profExp').value;

    await setDoc(doc(db, "staffs", staffEmail), {
        name, org, exp, email: staffEmail, role: 'compliance'
    }, { merge: true });

    alert("Staff Profile Updated!");
};

// --- Logout ---
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    location.href = 'index.html';
};
