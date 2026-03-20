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

// --- ১. স্টাফের নাম লোড (Realtime) ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    onSnapshot(collection(db, "users"), (snap) => {
        snap.forEach(userDoc => {
            const uData = userDoc.data();
            if (uData.email && uData.email.toLowerCase() === staffEmail.toLowerCase()) {
                if (displayElement) displayElement.innerText = uData.fullName || staffEmail;
            }
        });
    });
}
displayStaffName();

// --- ২. স্লাইডার ওপেন ও ফাইল লকিং লজিক ---
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

            // --- লকিং চেক ---
            // যদি ফাইলটি আগে থেকে অন্য কেউ হ্যান্ডেল করে থাকে
            if (d.handledBy && d.handledBy !== staffEmail) {
                updateBtn.disabled = true;
                updateBtn.innerText = `LOCKED BY: ${d.handledBy.split('@')[0].toUpperCase()}`;
                updateBtn.style.background = "#bdc3c7"; // Grey color for lock
            } else {
                // যদি ফাইলটি একদম নতুন হয় অথবা নিজের লক করা হয়
                updateBtn.disabled = false;
                updateBtn.innerText = "APPLY STATUS & SYNC WALLET";
                updateBtn.style.background = ""; // Default color

                // প্রথমবার ফাইল ওপেন করলে অটোমেটিক নিজের নামে লক করা
                if (!d.handledBy) {
                    await updateDoc(appRef, { handledBy: staffEmail });
                }
            }

            // ফাইল লিঙ্ক দেখানো
            if (docArea) {
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${docs.academic ? `<a href="${docs.academic}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Academic PDF</a>` : ''}
                        ${docs.passport ? `<a href="${docs.passport}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Passport PDF</a>` : ''}
                        ${docs.language ? `<a href="${docs.language}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Language PDF</a>` : ''}
                        ${docs.others ? `<a href="${docs.others}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Other Docs</a>` : ''}
                    </div>`;
                
                if (!docs.academic && !docs.passport && !docs.language && !docs.others) {
                    docArea.innerHTML = "<p style='color:#888; text-align:center; font-size:12px;'>No documents found.</p>";
                }
            }
        }
    } catch (e) { console.error("Lock error:", e); }
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
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><i class="fas fa-file-pdf" style="color:${isLocked ? '#bdc3c7' : 'var(--accent)'}"></i></td>
                <td><span class="status-pill">${(d.status || "pending").toUpperCase()}</span></td>
                <td><small style="color:${isLocked ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">
                    ${d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING'}
                </small></td>
                <td>
                    <button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')" 
                        style="${isLocked ? 'background:#bdc3c7;' : ''}">
                        ${isLocked ? 'LOCKED' : 'REVIEW'}
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('loader').style.display = 'none';
});

// --- ৪. APPLY STATUS & WALLET SYNC ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Please select an application!");

        updateBtn.innerText = "Syncing Wallet...";
        updateBtn.disabled = true;

        try {
            const appRef = doc(db, "applications", appId);
            const appSnap = await getDoc(appRef);
            const appData = appSnap.data();

            // পার্টনার ড্যাশবোর্ডের লজিক অনুযায়ী commissionStatus
            let cStatus = 'waiting'; 
            if (newStatus === 'verified') cStatus = 'pending'; 
            else if (newStatus === 'visa_success' || newStatus === 'student_paid') cStatus = 'ready'; 
            else if (newStatus === 'visa_rejected' || newStatus === 'doc_missing') cStatus = 'failed'; 

            const currentComm = appData.commission || 0;

            await updateDoc(appRef, {
                status: newStatus,
                commissionStatus: cStatus,
                commission: Number(currentComm),
                handledBy: staffEmail, // নিজের নাম কনফার্ম করা
                updatedAt: serverTimestamp()
            });

            alert(`Status updated to ${newStatus.toUpperCase()}. Wallet synced.`);
            closeSlider();

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            updateBtn.innerText = "APPLY STATUS & SYNC WALLET";
            updateBtn.disabled = false;
        }
    };
}

// --- ৫. লগআউট ---
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = 'index.html';
};
