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

// প্রোটেকশন: ইমেইল না থাকলে লগইন পেজে পাঠিয়ে দিবে
if (!staffEmail) {
    window.location.href = 'index.html';
}

// --- ১. রিভিউ স্লাইডার ওপেন ফাংশন (Global Scope) ---
window.openReview = async (id, sName) => {
    console.log("Reviewing:", sName);
    window.currentAppId = id; // গ্লোবাল আইডি সেভ রাখা আপডেট করার জন্য

    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');

    if (nameDisplay) nameDisplay.innerText = sName;

    // স্লাইডার ওপেন করা (CSS ক্লাসের সাথে মিল রেখে)
    if (slider) slider.classList.add('active');

    // ডক লিঙ্কগুলো লোড করা
    if (docArea) {
        docArea.innerHTML = "Loading Docs...";
        try {
            const snap = await getDoc(doc(db, "applications", id));
            if (snap.exists()) {
                const d = snap.data().docs || {};
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${d.academic ? `<a href="${d.academic}" target="_blank" style="background:var(--glass); color:var(--accent); padding:10px; border:1px solid var(--border); border-radius:6px; text-align:center; text-decoration:none; font-size:12px;">Academic Docs</a>` : ''}
                        ${d.passport ? `<a href="${d.passport}" target="_blank" style="background:var(--glass); color:var(--accent); padding:10px; border:1px solid var(--border); border-radius:6px; text-align:center; text-decoration:none; font-size:12px;">Passport Copy</a>` : ''}
                        ${d.language ? `<a href="${d.language}" target="_blank" style="background:var(--glass); color:var(--accent); padding:10px; border:1px solid var(--border); border-radius:6px; text-align:center; text-decoration:none; font-size:12px;">Language Prof.</a>` : ''}
                    </div>
                `;
            }
        } catch (e) {
            docArea.innerHTML = "Error loading documents.";
        }
    }
};

// --- ২. স্লাইডার ক্লোজ ফাংশন ---
window.closeSlider = () => {
    const slider = document.getElementById('reviewSlider');
    if (slider) slider.classList.remove('active');
};

// --- ৩. রিয়েল-টাইম অ্যাপ্লিকেশন লিস্ট লোড ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;

    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;
        const status = (d.status || "pending").toLowerCase();

        html += `
            <tr>
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td>${d.universityName || 'Not Set'}</td>
                <td><span style="padding:4px 10px; border-radius:20px; font-size:10px; background:rgba(255,255,255,0.1); color:var(--accent);">${status.toUpperCase()}</span></td>
                <td>
                    <button class="btn-claim" onclick="openReview('${id}', '${d.studentName}')">
                        REVIEW
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" align="center">No Applications Found</td></tr>';
    
    // লোডার লুকানো
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
});

// --- ৪. স্ট্যাটাস আপডেট করা ---
window.updateStatus = async () => {
    const newStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('adminNote')?.value || "";

    if (!window.currentAppId) return alert("Select an application first!");

    try {
        const btn = document.querySelector('.btn-claim[style*="background: var(--accent)"]'); // Update Button
        await updateDoc(doc(db, "applications", window.currentAppId), {
            status: newStatus,
            complianceNote: note,
            lastUpdatedBy: staffEmail,
            updatedAt: serverTimestamp()
        });
        alert("Application Status Updated!");
        closeSlider();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// --- ৫. লগআউট ---
window.logout = () => {
    localStorage.clear();
    window.location.href = 'index.html';
};
