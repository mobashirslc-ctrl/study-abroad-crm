import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// সেশন থেকে ইমেইল নেওয়া
const staffEmail = localStorage.getItem('userEmail');

// প্রোটেকশন
if (!staffEmail) {
    window.location.href = 'index.html';
}

// --- ১. স্টাফের নাম এবং প্রোফাইল লোড করা ---
async function loadStaffProfile() {
    try {
        // ফায়ারবেস অথ থেকে কারেন্ট ইউজার আইডি নেওয়া (অথবা ইমেইল দিয়ে সার্চ করা)
        // আপনার রেজিস্ট্রেশন লজিকে UID দিয়ে সেভ করা হয়েছিল
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const staffSnap = await getDoc(doc(db, "users", user.uid));
                if (staffSnap.exists()) {
                    const data = staffSnap.data();
                    document.getElementById('staffDisplay').innerText = data.fullName || staffEmail;
                    // প্রোফাইল ট্যাবেও ডাটা বসিয়ে দেওয়া
                    if(document.getElementById('profName')) document.getElementById('profName').value = data.fullName || "";
                    if(document.getElementById('profOrg')) document.getElementById('profOrg').value = data.agencyName || "";
                }
            } else {
                document.getElementById('staffDisplay').innerText = staffEmail;
            }
        });
    } catch (e) {
        document.getElementById('staffDisplay').innerText = staffEmail;
    }
}
loadStaffProfile();

// --- ২. স্লাইডার ওপেন ফাংশন ---
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
                    ${d.academic ? `<a href="${d.academic}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:11px;">Academic PDF</a>` : ''}
                    ${d.passport ? `<a href="${d.passport}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:11px;">Passport PDF</a>` : ''}
                </div>`;
        }
    }
};

window.closeSlider = () => {
    document.getElementById('reviewSlider').classList.remove('active');
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
                <td><span class="status-pill">${(d.status || 'pending').toUpperCase()}</span></td>
                <td><small>${d.handledBy || 'Waiting'}</small></td>
                <td><button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')">REVIEW</button></td>
            </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('loader').style.display = 'none';
});

// --- ৪. APPLY STATUS & WALLET SYNC (মূল ফিক্স) ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Please select a file first!");

        updateBtn.innerText = "Syncing Wallet & DB...";
        updateBtn.disabled = true;

        try {
            const appRef = doc(db, "applications", appId);
            const appSnap = await getDoc(appRef);
            const appData = appSnap.data();

            // ১. অ্যাপ্লিকেশন আপডেট
            await updateDoc(appRef, {
                status: newStatus,
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            // ২. ওয়ালেট লজিক (যদি Visa Success বা Verified হয়)
            // নোট: আপনার বিজনেস লজিক অনুযায়ী এখানে কন্ডিশন বদলাতে পারেন
            if (newStatus === 'verified' || newStatus === 'visa_success') {
                const partnerEmail = appData.partnerEmail;
                const commission = Number(appData.commission || 0);

                // পার্টনারের ওয়ালেট আপডেট (Transaction ব্যবহার করা নিরাপদ)
                // আমরা ধরে নিচ্ছি পার্টনারের ইমেইল দিয়ে ডক আইডি সেভ করা (অথবা UID ব্যবহার করুন)
                // এখানে আপনার ডাটাবেস স্ট্রাকচার অনুযায়ী partnerUid অথবা ইমেইল দিন
                const partnerRef = doc(db, "users", appData.partnerUid); 
                
                await updateDoc(partnerRef, {
                    walletBalance: (Number(appData.currentBalance || 0) + commission) 
                });
            }

            alert("Status Updated & Partner Notified!");
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
