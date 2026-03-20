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

// সেশন থেকে ইমেইল নেওয়া
const staffEmail = localStorage.getItem('userEmail');

// প্রোটেকশন: ইমেইল না থাকলে লগইন পেজে পাঠিয়ে দিবে
if (!staffEmail) {
    window.location.href = 'index.html';
}

// --- ১. স্টাফের নাম লোড করা ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    if (displayElement) {
        displayElement.innerText = staffEmail.split('@')[0].toUpperCase(); // Default Email Name
    }

    try {
        // ইউজার লিস্ট থেকে নাম খোঁজা
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

// --- ২. রিভিউ স্লাইডার ওপেন ফাংশন (Global Scope) ---
window.openReview = async (id, sName) => {
    window.currentAppId = id; 
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');

    if (nameDisplay) nameDisplay.innerText = sName;

    // স্লাইডার ওপেন করা (CSS ক্লাসের সাথে মিল রেখে)
    if (slider) slider.classList.add('active');

    // ডক লিঙ্কগুলো লোড করা
    if (docArea) {
        docArea.innerHTML = "Fetching Files...";
        try {
            const snap = await getDoc(doc(db, "applications", id));
            if (snap.exists()) {
                const d = snap.data().docs || {};
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${d.academic ? `<a href="${d.academic}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Academic PDF</a>` : ''}
                        ${d.passport ? `<a href="${d.passport}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">Passport PDF</a>` : ''}
                        ${d.language ? `<a href="${d.language}" target="_blank" style="background:var(--accent); color:#000; padding:10px; border-radius:5px; text-decoration:none; text-align:center; font-weight:bold; font-size:11px;">IELTS/Lang PDF</a>` : ''}
                    </div>
                `;
            }
        } catch (e) {
            docArea.innerHTML = "Error loading documents.";
        }
    }
};

// --- ৩. স্লাইডার ক্লোজ ফাংশন ---
window.closeSlider = () => {
    const slider = document.getElementById('reviewSlider');
    if (slider) slider.classList.remove('active');
};

// --- ৪. রিয়েল-টাইম অ্যাপ্লিকেশন লিস্ট লোড ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;

    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;
        const status = (d.status || "pending").toUpperCase();

        html += `
            <tr>
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><i class="fas fa-file-pdf" style="color:var(--accent)"></i></td>
                <td><span class="status-pill">${status}</span></td>
                <td><small>${d.handledBy || 'Waiting'}</small></td>
                <td>
                    <button class="btn-claim" onclick="openReview('${id}', '${d.studentName}')">
                        REVIEW
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="6" align="center">No Files Found</td></tr>';
    
    // লোডার লুকানো
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
});

// --- ৫. APPLY STATUS & WALLET SYNC (Crucial Fix) ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Please select an application first!");

        updateBtn.innerText = "Syncing with Partner...";
        updateBtn.disabled = true;

        try {
            const appRef = doc(db, "applications", appId);
            
            // পার্টনার ড্যাশবোর্ডের লজিক অনুযায়ী commissionStatus সেট করা
            let cStatus = 'waiting'; // ডিফল্ট
            if (newStatus === 'verified') cStatus = 'pending'; // পেন্ডিং ওয়ালেটে পাঠাবে
            if (newStatus === 'visa_success' || newStatus === 'student_paid') cStatus = 'ready'; // ফাইনাল ওয়ালেটে পাঠাবে

            // অ্যাপ্লিকেশন আপডেট
            await updateDoc(appRef, {
                status: newStatus,
                commissionStatus: cStatus, // এই ফিল্ডটি পার্টনার ড্যাশবোর্ডে টাকা দেখাবে
                handledBy: staffEmail,
                updatedAt: serverTimestamp()
            });

            alert("Update Successful! Partner wallet has been synced.");
            closeSlider();

        } catch (e) {
            console.error("Critical Sync Error:", e);
            alert("Error: " + e.message);
        } finally {
            updateBtn.innerText = "APPLY STATUS & SYNC WALLET";
            updateBtn.disabled = false;
        }
    };
}

// --- ৬. লগআউট ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        window.location.href = 'index.html';
    };
}
