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

// Global staff mapping to show NAMES instead of emails
let staffNames = {};

// --- Loader Logic ---
window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 1000);
});

// --- 1. Fetch all staff names for display ---
const loadStaffNames = async () => {
    const q = query(collection(db, "staffs"));
    const snap = await getDocs(q);
    snap.forEach(d => {
        staffNames[d.id] = d.data().name || d.id;
    });
};

// --- 2. Load Incoming Applications ---
onSnapshot(collection(db, "applications"), async (snap) => {
    await loadStaffNames(); // Refresh names list
    
    const tbody = document.getElementById('incomingTableBody');
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

        // 4 Documents logic
        const ds = d.docs || {};
        let docLinks = "";
        if(ds.academic) docLinks += `<a href="${ds.academic}" target="_blank" style="color:var(--accent); margin-right:5px;" title="Academic">[A]</a>`;
        if(ds.language) docLinks += `<a href="${ds.language}" target="_blank" style="color:var(--accent); margin-right:5px;" title="Language">[L]</a>`;
        if(ds.passport) docLinks += `<a href="${ds.passport}" target="_blank" style="color:var(--accent); margin-right:5px;" title="Passport">[P]</a>`;
        if(ds.others) docLinks += `<a href="${ds.others}" target="_blank" style="color:var(--accent);" title="Others">[O]</a>`;

        // Handle staff name display
        const handlerDisplay = staffNames[d.handledBy] || d.handledBy || '<span style="color:#666;">Unclaimed</span>';

        tbody.innerHTML += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo}</td>
                <td>${docLinks || 'No Files'}</td>
                <td><span class="status-pill ${d.status}">${d.status.toUpperCase()}</span></td>
                <td><i class="fas fa-user-check" style="font-size:10px; color:var(--accent);"></i> ${handlerDisplay}</td>
                <td><button class="btn-claim" onclick="openReview('${id}', '${d.studentName}', '${d.commission}')">Review</button></td>
            </tr>`;
    });

    document.getElementById('hTotal').innerText = totalServed;
    document.getElementById('hSuccess').innerText = visaSuccess;
    document.getElementById('hPartners').innerText = partnersSet.size;
});

// --- 3. Review Slider Logic (Global Binding) ---
window.openReview = (id, sName, comm) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('targetComm').innerText = `Commission: ৳${Number(comm).toLocaleString()}`;
    
    // Fetch docs for current review
    const appRef = doc(db, "applications", id);
    getDoc(appRef).then(s => {
        const d = s.data().docs || {};
        const area = document.getElementById('docLinksArea');
        area.innerHTML = `
            <p style="font-size:12px; margin-bottom:10px; color:#aaa;">Verify Documents:</p>
            ${d.academic ? `<a href="${d.academic}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:5px 10px; font-size:11px;">Academic PDF</a>` : ''}
            ${d.language ? `<a href="${d.language}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:5px 10px; font-size:11px;">Language PDF</a>` : ''}
            ${d.passport ? `<a href="${d.passport}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:5px 10px; font-size:11px;">Passport PDF</a>` : ''}
            ${d.others ? `<a href="${d.others}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:5px 10px; font-size:11px;">Other File</a>` : ''}
        `;
    });

    document.getElementById('reviewSlider').classList.add('open');
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('open');

// --- 4. Status Update Logic ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const appRef = doc(db, "applications", window.currentAppId);
    
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        const appSnap = await getDoc(appRef);
        const appData = appSnap.data();
        let commStatus = appData.commissionStatus || "waiting";

        if (newStatus === "verified") commStatus = "pending";
        else if (newStatus === "student_paid") commStatus = "ready";
        else if (newStatus === "visa_rejected") commStatus = "waiting";

        await updateDoc(appRef, {
            status: newStatus,
            commissionStatus: commStatus,
            handledBy: staffEmail, // This saves the staff email as ID
            updatedAt: serverTimestamp()
        });

        alert("Sync Complete!");
        closeSlider();
    } catch (e) {
        alert("Update Failed!");
    } finally {
        btn.innerText = "APPLY STATUS & SYNC WALLET"; btn.disabled = false;
    }
};

// --- 5. Staff Profile Setup ---
onSnapshot(doc(db, "staffs", staffEmail), (dSnap) => {
    if (dSnap.exists()) {
        const d = dSnap.data();
        document.getElementById('staffDisplay').innerText = d.name || staffEmail;
        document.getElementById('profName').value = d.name || "";
        document.getElementById('profOrg').value = d.org || "";
        document.getElementById('profExp').value = d.exp || "";
    }
});

document.getElementById('saveProfileBtn').onclick = async () => {
    const name = document.getElementById('profName').value;
    const org = document.getElementById('profOrg').value;
    const exp = document.getElementById('profExp').value;

    await setDoc(doc(db, "staffs", staffEmail), {
        name, org, exp, email: staffEmail
    }, { merge: true });

    alert("Profile Saved!");
};

document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    location.href = 'index.html';
};
