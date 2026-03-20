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

// সেশন থেকে ডাটা নেওয়া
const staffEmail = localStorage.getItem('userEmail');

// প্রোটেকশন
if (!staffEmail) {
    window.location.href = 'index.html';
}

// --- ১. স্টাফের নাম লোড করা (FIXED) ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    if (displayElement) {
        displayElement.innerText = staffEmail.split('@')[0].toUpperCase(); // Default
    }

    try {
        onSnapshot(collection(db, "users"), (snap) => {
            snap.forEach(userDoc => {
                const uData = userDoc.data();
                if (uData.email && uData.email.toLowerCase() === staffEmail.toLowerCase()) {
                    if (displayElement) displayElement.innerText = uData.fullName || staffEmail;
                }
            });
        });
    } catch (e) { console.error("Name load error:", e); }
}
displayStaffName();

// --- ২. রিভিউ স্লাইডার ওপেন (Global Scope) ---
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');

    if (nameDisplay) nameDisplay.innerText = sName;
    if (slider) slider.classList.add('active');

    if (docArea) {
        docArea.innerHTML = "Fetching Documents...";
        try {
            const snap = await getDoc(doc(db, "applications", id));
            if (snap.exists()) {
                const d = snap.data().docs || {};
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                        ${d.academic ? `<a href="${d.academic}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Academic PDF</a>` : ''}
                        ${d.passport ? `<a href="${d.passport}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Passport PDF</a>` : ''}
                    </div>`;
            } else { docArea.innerHTML = "No documents found."; }
        } catch (e) { docArea.innerHTML = "Error loading docs."; }
    }
};

window.closeSlider = () => {
    const slider = document.getElementById('reviewSlider');
    if (slider) slider.classList.remove('active');
};

// --- ৩. রিয়েল-টাইম অ্যাপ্লিকেশন লিস্ট ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        html += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><i class="fas fa-file-pdf" style="color:var(--accent)"></i></td>
                <td><span class="status-pill">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td><small>${d.handledBy || 'Unclaimed'}</small></td>
                <td><button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')">Review</button></td>
            </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="6" align="center">No files in queue.</td></tr>';
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
});

// --- ৪. APPLY STATUS & WALLET SYNC (Safe & Error-Proof Version) ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Please select an application first!");

        updateBtn.innerText = "Syncing...";
        updateBtn.disabled = true;

        try {
            const appRef = doc(db, "applications", appId);
            const appSnap = await getDoc(appRef);
            
            if (!appSnap.exists()) throw new Error("Application records missing!");
            const appData = appSnap.data();

            // ১. মেইন স্ট্যাটাস আপডেট
            await updateDoc(appRef, {
                status: newStatus,
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            // ২. ওয়ালেট সিঙ্ক লজিক
            const successTriggers = ['verified', 'visa_success', 'student_paid'];
            if (successTriggers.includes(newStatus.toLowerCase())) {
                
                // আইডি না থাকলে অল্টারনেট ইমেইল ব্যবহারের চেষ্টা
                const partnerKey = appData.partnerUid || appData.partnerEmail;

                if (partnerKey) {
                    const commission = Number(appData.commission || 0);
                    const pRef = doc(db, "users", partnerKey);
                    const pSnap = await getDoc(pRef);

                    if (pSnap.exists()) {
                        const currentBal = Number(pSnap.data().walletBalance || 0);
                        await updateDoc(pRef, {
                            walletBalance: currentBal + commission
                        });
                        console.log("Wallet synced!");
                    }
                }
            }

            alert("Update Successful!");
            closeSlider();

        } catch (e) {
            console.error("Sync Error:", e);
            alert("Updated with sync note: " + e.message);
            closeSlider();
        } finally {
            updateBtn.innerText = "APPLY STATUS & SYNC WALLET";
            updateBtn.disabled = false;
        }
    };
}

// --- ৫. লগআউট ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        window.location.href = 'index.html';
    };
}
