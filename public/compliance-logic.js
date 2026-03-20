import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- ১. স্টাফের নাম লোড ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
        if (d.exists() && displayElement) displayElement.innerText = d.data().fullName || staffEmail;
    });
}
displayStaffName();

// --- ২. স্লাইডার ও ফাইল লকিং ---
window.openReview = async (id, sName) => {
    window.currentAppId = id; 
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');
    const updateBtn = document.getElementById('updateStatusBtn');

    if (nameDisplay) nameDisplay.innerText = sName;
    if (slider) slider.classList.add('active');

    try {
        const appRef = doc(db, "applications", id);
        const snap = await getDoc(appRef);
        if (snap.exists()) {
            const d = snap.data();
            const docs = d.docs || {};

            if (d.handledBy && d.handledBy !== staffEmail) {
                updateBtn.disabled = true;
                updateBtn.innerText = `LOCKED BY: ${d.handledBy.split('@')[0].toUpperCase()}`;
                updateBtn.style.background = "#bdc3c7"; 
            } else {
                updateBtn.disabled = false;
                updateBtn.innerText = "UPDATE STATUS & SYNC";
                updateBtn.style.background = ""; 
                if (!d.handledBy) await updateDoc(appRef, { handledBy: staffEmail });
            }

            if (docArea) {
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${docs.academic ? `<a href="${docs.academic}" target="_blank" class="doc-btn">Academic PDF</a>` : ''}
                        ${docs.passport ? `<a href="${docs.passport}" target="_blank" class="doc-btn">Passport PDF</a>` : ''}
                    </div>`;
            }
        }
    } catch (e) { console.error(e); }
};

window.closeSlider = () => { document.getElementById('reviewSlider').classList.remove('active'); };

// --- ৩. টেবিল লোড ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const isLocked = d.handledBy && d.handledBy !== staffEmail;
        html += `
            <tr style="${isLocked ? 'opacity: 0.7;' : ''}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><span class="status-pill ${d.status}">${(d.status || "pending").toUpperCase()}</span></td>
                <td><small>${d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING'}</small></td>
                <td><button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')" ${isLocked ? 'disabled' : ''}>REVIEW</button></td>
            </tr>`;
    });
    tbody.innerHTML = html;
});

// --- ৪. ড্রপডাউন ভ্যালু অনুযায়ী স্ট্যাটাস আপডেট লজিক ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value; // নিশ্চিত করুন HTML-এ value গুলো: 'verified', 'student paid to uni', 'visa rejected'
        const appId = window.currentAppId;
        if (!appId) return alert("Select an application!");

        updateBtn.innerText = "Updating...";
        updateBtn.disabled = true;

        try {
            await updateDoc(doc(db, "applications", appId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                handledBy: staffEmail
            });
            alert("Status Updated Successfully!");
            closeSlider();
        } catch (e) { alert(e.message); }
        finally { updateBtn.innerText = "UPDATE STATUS & SYNC"; updateBtn.disabled = false; }
    };
}
