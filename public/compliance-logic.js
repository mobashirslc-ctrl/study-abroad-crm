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

// --- ২. স্লাইডার ওপেন ---
window.openReview = async (id, sName) => {
    window.currentAppId = id; 
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');

    if (nameDisplay) nameDisplay.innerText = sName;
    if (slider) slider.classList.add('active');

    if (docArea) {
        docArea.innerHTML = "Fetching Files...";
        const snap = await getDoc(doc(db, "applications", id));
        if (snap.exists()) {
            const d = snap.data().docs || {};
            docArea.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                    ${d.academic ? `<a href="${d.academic}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Academic PDF</a>` : ''}
                    ${d.passport ? `<a href="${d.passport}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Passport PDF</a>` : ''}
                </div>`;
        }
    }
};

window.closeSlider = () => { document.getElementById('reviewSlider').classList.remove('active'); };

// --- ৩. টেবিল লোড ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        html += `
            <tr>
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><i class="fas fa-file-pdf" style="color:var(--accent)"></i></td>
                <td><span class="status-pill">${(d.status || "pending").toUpperCase()}</span></td>
                <td><small>${d.handledBy || 'Waiting'}</small></td>
                <td><button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')">REVIEW</button></td>
            </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('loader').style.display = 'none';
});

// --- ৪. APPLY STATUS & WALLET SYNC (The Guaranteed Fix) ---
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

            // পার্টনার ড্যাশবোর্ডের লজিক অনুযায়ী commissionStatus সেট করা
            // মনে রাখবেন: পার্টনার কোডে 'pending' মানেই পেন্ডিং ওয়ালেটে টাকা যোগ হওয়া
            let cStatus = appData.commissionStatus || 'waiting'; 
            
            if (newStatus === 'verified') {
                cStatus = 'pending';
            } else if (newStatus === 'visa_success' || newStatus === 'student_paid') {
                cStatus = 'ready';
            }

            // অত্যন্ত গুরুত্বপূর্ণ: কমিশন ভ্যালু নিশ্চিত করা
            const currentComm = appData.commission || 0;

            await updateDoc(appRef, {
                status: newStatus,
                commissionStatus: cStatus,
                commission: Number(currentComm), // নিশ্চিত করা হচ্ছে এটি Number
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            alert("Success! Partner wallet is now updated.");
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
