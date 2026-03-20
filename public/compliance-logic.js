import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const hideLoader = () => {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';
};

// --- 1. STAFF PROFILE SYNC ---
async function initStaff() {
    const displayElement = document.getElementById('staffDisplay');
    if (displayElement) displayElement.innerText = staffEmail.split('@')[0].toUpperCase();

    try {
        onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
            if (d.exists()) {
                const data = d.data();
                if (displayElement) displayElement.innerText = data.fullName || staffEmail.split('@')[0].toUpperCase();
                if (document.getElementById('profName')) document.getElementById('profName').value = data.fullName || "";
                if (document.getElementById('profOrg')) document.getElementById('profOrg').value = data.organization || "";
                if (document.getElementById('profExp')) document.getElementById('profExp').value = data.experience || "";
            }
            hideLoader();
        });
    } catch (e) { hideLoader(); }
}

// --- 2. INCOMING TABLE (FIXED DATA LOADING) ---
const incomingRef = collection(db, "applications");
const qIncoming = query(incomingRef, orderBy("createdAt", "desc"));

onSnapshot(qIncoming, (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if(!tbody) return;
    
    let html = "";
    if (snap.empty) {
        html = "<tr><td colspan='6' style='text-align:center; padding:20px; color:rgba(255,255,255,0.5);'>No Incoming Files Found.</td></tr>";
    } else {
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const id = dSnap.id;
            const isLocked = d.handledBy && d.handledBy.toLowerCase() !== staffEmail.toLowerCase();
            const handlerName = d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING';
            const agencyName = d.partnerName || (d.partnerEmail ? d.partnerEmail.split('@')[0].toUpperCase() : 'N/A');

            html += `
                <tr style="${isLocked ? 'opacity: 0.6;' : 'opacity: 1;'}">
                    <td>
                        <div style="font-weight:bold; color:#fff;">${d.studentName || 'Unknown Student'}</div>
                        <div style="font-size:10px; opacity:0.5;">ID: ${id.slice(-6)}</div>
                    </td>
                    <td>
                        <div style="color:#a29bfe; font-weight:600; font-size:13px;">
                            <i class="fas fa-handshake" style="margin-right:5px;"></i> ${agencyName}
                        </div>
                    </td>
                    <td>${d.passportNo || 'N/A'}</td>
                    <td><span class="status-pill ${d.status || 'pending'}">${(d.status || 'pending').toUpperCase()}</span></td>
                    <td style="color: ${isLocked ? '#e74c3c' : '#2ecc71'}; font-weight: bold; font-size:12px;">
                        <i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock-alt'}"></i> ${handlerName}
                    </td>
                    <td>
                        <button class="btn-claim" onclick="window.openReview('${id}', '${d.studentName}')" 
                            style="${isLocked ? 'background:#555; cursor:not-allowed;' : ''}" 
                            ${isLocked ? 'disabled' : ''}>
                            ${isLocked ? 'LOCKED' : 'ACTION'}
                        </button>
                    </td>
                </tr>`;
        });
    }
    tbody.innerHTML = html;
});

// --- 3. REVIEW SLIDER LOGIC ---
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName || "Student Details";
    document.getElementById('reviewSlider').classList.add('active');

    const appRef = doc(db, "applications", id);
    const snap = await getDoc(appRef);
    
    if (snap.exists()) {
        const d = snap.data();
        if (!d.handledBy) await updateDoc(appRef, { handledBy: staffEmail.toLowerCase() });

        document.getElementById('docLinksArea').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="${d.docs?.academic || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:12px;">ACADEMIC PDF</a>
                <a href="${d.docs?.passport || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:12px;">PASSPORT PDF</a>
            </div>`;
        document.getElementById('statusSelect').value = d.status || "pending";
    }
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

// --- 4. ACTION BUTTONS ---
document.getElementById('updateStatusBtn').onclick = async () => {
    if (!window.currentAppId) return;
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;

    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        await updateDoc(doc(db, "applications", window.currentAppId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
            handledBy: staffEmail.toLowerCase()
        });
        alert("Status Updated!");
        closeSlider();
    } catch (e) { alert(e.message); }
    finally { btn.innerText = "APPLY STATUS & SYNC WALLET"; btn.disabled = false; }
};

document.getElementById('saveProfileBtn').onclick = async () => {
    try {
        await updateDoc(doc(db, "users", staffEmail.toLowerCase()), {
            fullName: document.getElementById('profName').value,
            organization: document.getElementById('profOrg').value,
            experience: document.getElementById('profExp').value
        });
        alert("Profile Saved!");
    } catch (e) { alert(e.message); }
};

// History / Stats
onSnapshot(query(collection(db, "applications"), where("handledBy", "==", staffEmail.toLowerCase())), (snap) => {
    if(document.getElementById('hTotal')) document.getElementById('hTotal').innerText = snap.size;
    let success = 0;
    snap.forEach(doc => { if(doc.data().status === 'visa_success') success++; });
    if(document.getElementById('hSuccess')) document.getElementById('hSuccess').innerText = success;
});

document.getElementById('logoutBtn').onclick = () => {
    if(confirm("Logout?")) { localStorage.clear(); location.href='index.html'; }
};

initStaff();
