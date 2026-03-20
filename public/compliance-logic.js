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

// --- ১. স্টাফ নাম ও প্রোফাইল ফিক্স ---
async function initStaff() {
    const displayElement = document.getElementById('staffDisplay');
    
    // ব্যাকআপ হিসেবে ইমেইল থেকে নাম দেখানো (যদি ডাটাবেস লোড হতে দেরি হয়)
    if (displayElement) displayElement.innerText = staffEmail.split('@')[0].toUpperCase();

    try {
        onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
            if (d.exists()) {
                const data = d.data();
                const fullName = data.fullName || staffEmail.split('@')[0].toUpperCase();
                
                // ড্যাশবোর্ড ও প্রোফাইল সব জায়গায় নাম সেট করা
                if (displayElement) displayElement.innerText = fullName;
                if (document.getElementById('profName')) document.getElementById('profName').value = data.fullName || "";
                if (document.getElementById('profOrg')) document.getElementById('profOrg').value = data.organization || "";
                if (document.getElementById('profExp')) document.getElementById('profExp').value = data.experience || "";
            }
            hideLoader();
        }, (err) => { 
            console.error("Profile Fetch Error:", err);
            hideLoader(); 
        });
    } catch (e) { hideLoader(); }
}

// --- ২. ইনকামিং টেবিল ও ফাইল লকিং ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if(!tbody) return;
    let html = "";
    
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;
        const isLocked = d.handledBy && d.handledBy.toLowerCase() !== staffEmail.toLowerCase();
        const handlerName = d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING';

        html += `
            <tr style="${isLocked ? 'opacity: 0.6;' : ''}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><button onclick="window.openReview('${id}', '${d.studentName}')" class="btn-claim" style="padding:5px 10px;">VIEW</button></td>
                <td><span class="status-pill ${d.status}">${(d.status || 'pending').toUpperCase()}</span></td>
                <td style="color: ${isLocked ? '#e74c3c' : '#2ecc71'}; font-weight: bold;">
                    <i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock'}"></i> ${handlerName}
                </td>
                <td>
                    <button class="btn-claim" onclick="window.openReview('${id}', '${d.studentName}')" 
                        ${isLocked ? 'disabled style="background:#bdc3c7;"' : ''}>
                        ${isLocked ? 'LOCKED' : 'ACTION'}
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='6' align='center'>No Applications Found</td></tr>";
});

// --- ৩. রিভিউ স্লাইডার ও ওনারশিপ ---
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('reviewSlider').classList.add('active');

    const appRef = doc(db, "applications", id);
    const snap = await getDoc(appRef);
    
    if (snap.exists()) {
        const d = snap.data();
        // ফাইলটি নিজের নামে লক করা
        if (!d.handledBy) await updateDoc(appRef, { handledBy: staffEmail.toLowerCase() });

        document.getElementById('docLinksArea').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="${d.docs?.academic || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none;">ACADEMIC PDF</a>
                <a href="${d.docs?.passport || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none;">PASSPORT PDF</a>
            </div>`;
        document.getElementById('statusSelect').value = d.status || "pending";
    }
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

// --- ৪. স্ট্যাটাস আপডেট ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;
    if (!window.currentAppId) return;

    btn.innerText = "Syncing..."; btn.disabled = true;
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

// --- ৫. প্রোফাইল ও হিস্ট্রি স্ট্যাটস ---
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
