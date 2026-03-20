import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy, serverTimestamp, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

if (!staffEmail) { window.location.href = 'index.html'; }

// --- লোডার কন্ট্রোল ---
const hideLoader = () => {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';
};

// --- ১. স্টাফ প্রোফাইল লোড ও সেভ ---
async function initProfile() {
    const docRef = doc(db, "users", staffEmail.toLowerCase());
    onSnapshot(docRef, (d) => {
        if (d.exists()) {
            const data = d.data();
            document.getElementById('staffDisplay').innerText = data.fullName || staffEmail;
            document.getElementById('profName').value = data.fullName || "";
            document.getElementById('profOrg').value = data.organization || "";
            document.getElementById('profExp').value = data.experience || "";
        }
        hideLoader();
    });
}

document.getElementById('saveProfileBtn').onclick = async () => {
    const btn = document.getElementById('saveProfileBtn');
    btn.innerText = "Saving...";
    try {
        await updateDoc(doc(db, "users", staffEmail.toLowerCase()), {
            fullName: document.getElementById('profName').value,
            organization: document.getElementById('profOrg').value,
            experience: document.getElementById('profExp').value
        });
        alert("Profile Updated!");
    } catch (e) { alert("Error: " + e.message); }
    btn.innerText = "Save Profile";
};

// --- ২. ইনকামিং ফাইল টেবিল ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const isLocked = d.handledBy && d.handledBy !== staffEmail;
        html += `
            <tr style="${isLocked ? 'opacity: 0.6' : ''}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo}</td>
                <td><button onclick="window.openReview('${dSnap.id}', '${d.studentName}')" class="btn-claim" style="padding:5px 10px;">VIEW</button></td>
                <td><span class="status-pill ${d.status}">${(d.status || 'pending').toUpperCase()}</span></td>
                <td><small>${d.handledBy ? d.handledBy.split('@')[0] : 'WAITING'}</small></td>
                <td><button class="btn-claim" onclick="window.openReview('${dSnap.id}', '${d.studentName}')" ${isLocked ? 'disabled' : ''}>${isLocked ? 'LOCKED' : 'ACTION'}</button></td>
            </tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='6'>No files found.</td></tr>";
});

// --- ৩. রিভিউ ও ফাইল লকিং ---
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('reviewSlider').classList.add('active');

    const appRef = doc(db, "applications", id);
    const snap = await getDoc(appRef);
    if (snap.exists()) {
        const d = snap.data();
        if (!d.handledBy) await updateDoc(appRef, { handledBy: staffEmail });
        
        document.getElementById('statusSelect').value = d.status || "pending";
        document.getElementById('docLinksArea').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="${d.docs?.academic || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none;">Academic PDF</a>
                <a href="${d.docs?.passport || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none;">Passport PDF</a>
            </div>`;
    }
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

// --- ৪. স্ট্যাটাস আপডেট লজিক ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const newStatus = document.getElementById('statusSelect').value;
    if (!window.currentAppId) return;

    const btn = document.getElementById('updateStatusBtn');
    btn.innerText = "Syncing...";
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "applications", window.currentAppId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
            handledBy: staffEmail
        });
        alert("Status Updated!");
        closeSlider();
    } catch (e) { alert(e.message); }
    btn.innerText = "APPLY STATUS & SYNC WALLET";
    btn.disabled = false;
};

// --- ৫. স্টাফ হিস্ট্রি (Stats) ---
onSnapshot(query(collection(db, "applications"), where("handledBy", "==", staffEmail)), (snap) => {
    let total = snap.size;
    let success = 0;
    let partners = new Set();

    snap.forEach(doc => {
        const d = doc.data();
        if (d.status === 'visa_success') success++;
        partners.add(d.partnerEmail);
    });

    document.getElementById('hTotal').innerText = total;
    document.getElementById('hSuccess').innerText = success;
    document.getElementById('hPartners').innerText = partners.size;
});

// লগআউট
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    location.href = 'index.html';
};

initProfile();
