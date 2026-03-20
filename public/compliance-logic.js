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
const staffRole = localStorage.getItem('userRole');

// ১. স্টাফের নাম লোড করার সহজ এবং ফিক্সড পদ্ধতি
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    if (!staffEmail) {
        window.location.href = 'index.html';
        return;
    }
    
    // প্রথমে ইমেইলটি দেখাবে যাতে "Loading" আটকে না থাকে
    displayElement.innerText = staffEmail.split('@')[0].toUpperCase();

    try {
        // সব ইউজারদের থেকে এই ইমেইলের ইউজারকে খুঁজে বের করা
        onSnapshot(collection(db, "users"), (snap) => {
            snap.forEach(userDoc => {
                if (userDoc.data().email === staffEmail) {
                    displayElement.innerText = userDoc.data().fullName || staffEmail;
                }
            });
        });
    } catch (e) {
        console.error("Staff Name Load Error", e);
    }
}
displayStaffName();

// ২. রিভিউ স্লাইডার ওপেন
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');

    if (nameDisplay) nameDisplay.innerText = sName;
    if (slider) slider.classList.add('active');

    if (docArea) {
        docArea.innerHTML = "Loading Docs...";
        const snap = await getDoc(doc(db, "applications", id));
        if (snap.exists()) {
            const d = snap.data().docs || {};
            docArea.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    ${d.academic ? `<a href="${d.academic}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:12px;">Academic PDF</a>` : ''}
                    ${d.passport ? `<a href="${d.passport}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:12px;">Passport PDF</a>` : ''}
                </div>`;
        }
    }
};

window.closeSlider = () => {
    document.getElementById('reviewSlider').classList.remove('active');
};

// ৩. টেবিল লোড
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        html += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'A690234'}</td>
                <td><i class="fas fa-file-pdf" style="color:var(--accent)"></i></td>
                <td><span class="status-pill">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td><small>${d.handledBy || 'Unclaimed'}</small></td>
                <td><button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')">Review</button></td>
            </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('loader').style.display = 'none';
});

// ৪. APPLY STATUS & WALLET SYNC (এরর ফিক্সড ভার্সন)
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Select a file first!");

        updateBtn.innerText = "Processing...";
        updateBtn.disabled = true;

        try {
            const appRef = doc(db, "applications", appId);
            const appSnap = await getDoc(appRef);
            
            if (!appSnap.exists()) throw new Error("Application data not found!");
            const appData = appSnap.data();

            // মেইন আপডেট
            await updateDoc(appRef, {
                status: newStatus,
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            // ওয়ালেট সিঙ্ক (শুধুমাত্র ভেরিফাইড হলে)
            if (newStatus === 'verified' || newStatus === 'visa_success') {
                const partnerEmail = appData.partnerEmail;
                const commission = Number(appData.commission || 0);

                // ইমেইল দিয়ে পার্টনারকে খুঁজে বের করা (indexOf এরর এড়াতে)
                const userQuery = await getDoc(doc(db, "users", appData.partnerUid || "no-id"));
                if (userQuery.exists()) {
                    const currentBal = Number(userQuery.data().walletBalance || 0);
                    await updateDoc(doc(db, "users", userQuery.id), {
                        walletBalance: currentBal + commission
                    });
                }
            }

            alert("Status Updated Successfully!");
            closeSlider();
        } catch (e) {
            console.error(e);
            alert("Update Success with Wallet Note: " + e.message);
            closeSlider();
        } finally {
            updateBtn.innerText = "APPLY STATUS & SYNC WALLET";
            updateBtn.disabled = false;
        }
    };
}

// ৫. লগআউট
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = 'index.html';
};
