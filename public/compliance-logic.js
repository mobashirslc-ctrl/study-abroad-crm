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

// --- ০. ইউটিলিটি ফাংশন (লোডার সরানোর জন্য) ---
const hideLoader = () => {
    const overlay = document.querySelector('.securing-session-overlay'); 
    const loader = document.getElementById('loader');
    if(overlay) overlay.style.display = 'none';
    if(loader) loader.style.display = 'none';
};

if (!staffEmail) { window.location.href = 'index.html'; }

// --- ১. স্টাফের নাম ও প্রোফাইল ডাটা লোড ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    const pName = document.getElementById('profName');
    const pEmail = document.getElementById('profEmail');

    if (!staffEmail) return;

    onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
        if (d.exists()) {
            const userData = d.data();
            const fullName = userData.fullName || staffEmail;
            if (displayElement) displayElement.innerText = fullName;
            if (pName) pName.innerText = fullName;
            if (pEmail) pEmail.innerText = staffEmail;
        } else {
            if (displayElement) displayElement.innerText = staffEmail.split('@')[0].toUpperCase();
        }
        hideLoader();
    }, (err) => { hideLoader(); });
}
displayStaffName();

// --- ২. স্লাইডার ও ফাইল লকিং (Review System) ---
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

            // লকিং লজিক
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

            // ডকুমেন্ট বাটন তৈরি
            if (docArea) {
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${docs.academic ? `<a href="${docs.academic}" target="_blank" class="doc-btn" style="background:#f1c40f; color:#000; padding:10px; text-align:center; text-decoration:none; border-radius:5px; font-weight:bold; font-size:12px;">Academic PDF</a>` : ''}
                        ${docs.passport ? `<a href="${docs.passport}" target="_blank" class="doc-btn" style="background:#f1c40f; color:#000; padding:10px; text-align:center; text-decoration:none; border-radius:5px; font-weight:bold; font-size:12px;">Passport PDF</a>` : ''}
                    </div>`;
                if(!docs.academic && !docs.passport) docArea.innerHTML = "<p>No documents available.</p>";
            }
        }
    } catch (e) { console.error(e); }
};

window.closeSlider = () => { document.getElementById('reviewSlider').classList.remove('active'); };

// --- ৩. ইনকামিং অ্যাপ্লিকেশন টেবিল লোড ---
const loadIncomingTable = () => {
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
        tbody.innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        hideLoader();
    });
};
loadIncomingTable();

// --- ৪. স্টাফ প্রসেসিং হিস্ট্রি লোড ---
const loadStaffHistory = () => {
    const historyBody = document.getElementById('historyTableBody');
    if (!historyBody) return;

    const q = query(collection(db, "applications"), where("handledBy", "==", staffEmail.toLowerCase()), orderBy("updatedAt", "desc"));

    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const date = d.updatedAt?.toDate() ? d.updatedAt.toDate().toLocaleDateString('en-GB') : 'Recently';
            html += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.university}</td>
                <td><span class="status-pill ${d.status}">${d.status.toUpperCase()}</span></td>
                <td>${date}</td>
            </tr>`;
        });
        historyBody.innerHTML = html || "<tr><td colspan='4' align='center'>No history found.</td></tr>";
    });
};

// --- ৫. স্ট্যাটাস আপডেট ও ওয়ালেট সিঙ্ক লজিক ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;
        if (!appId) return alert("Select an application!");

        updateBtn.innerText = "Syncing...";
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

// --- ৬. ট্যাব চেঞ্জিং লজিক ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');

    if(id === 'historySection') loadStaffHistory();
};

window.logout = () => { if(confirm("Logout?")) { localStorage.clear(); location.href='index.html'; } };
