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

// --- ১. স্টাফ নাম ও সেশন ---
async function initStaff() {
    onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
        if (d.exists()) {
            const data = d.data();
            document.getElementById('staffDisplay').innerText = data.fullName || staffEmail;
            // প্রোফাইল ফিল্ডগুলো আপডেট
            if(document.getElementById('profName')) document.getElementById('profName').value = data.fullName || "";
            if(document.getElementById('profOrg')) document.getElementById('profOrg').value = data.organization || "";
            if(document.getElementById('profExp')) document.getElementById('profExp').value = data.experience || "";
        }
        hideLoader();
    });
}

// --- ২. ইনকামিং টেবিল ও ফাইল লকিং লজিক (নিখুঁত লকিং) ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    let html = "";
    
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;
        
        // লক চেকিং: যদি অন্য কেউ হ্যান্ডেল করে থাকে
        const isLocked = d.handledBy && d.handledBy.toLowerCase() !== staffEmail.toLowerCase();
        const handlerName = d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING';

        html += `
            <tr style="${isLocked ? 'opacity: 0.6; background: #f9f9f9;' : ''}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><button onclick="window.openReview('${id}', '${d.studentName}')" class="btn-claim" style="padding:5px 10px; background:var(--accent);">VIEW</button></td>
                <td><span class="status-pill ${d.status}">${(d.status || 'pending').toUpperCase()}</span></td>
                <td style="color: ${isLocked ? '#e74c3c' : '#2ecc71'}; font-weight: bold;">
                    <i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock'}"></i> ${handlerName}
                </td>
                <td>
                    <button class="btn-claim" 
                        onclick="window.openReview('${id}', '${d.studentName}')" 
                        ${isLocked ? 'disabled style="background:#bdc3c7; cursor:not-allowed;"' : ''}>
                        ${isLocked ? 'LOCKED' : 'ACTION'}
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='6' align='center'>No Applications Found</td></tr>";
});

// --- ৩. রিভিউ স্লাইডার ওপেন এবং লক সেট করা ---
window.openReview = async (id, sName) => {
    window.currentAppId = id;
    const slider = document.getElementById('reviewSlider');
    const updateBtn = document.getElementById('updateStatusBtn');
    
    document.getElementById('targetStudent').innerText = sName;
    slider.classList.add('active');

    const appRef = doc(db, "applications", id);
    const snap = await getDoc(appRef);
    
    if (snap.exists()) {
        const d = snap.data();

        // যদি ফাইলটি এখনো কারো নামে লক না থাকে, তবে বর্তমান স্টাফের নামে লক করে দাও
        if (!d.handledBy) {
            await updateDoc(appRef, { handledBy: staffEmail.toLowerCase() });
        }

        // ডকুমেন্ট লিঙ্ক দেখানো
        document.getElementById('docLinksArea').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <a href="${d.docs?.academic || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:12px;">ACADEMIC PDF</a>
                <a href="${d.docs?.passport || '#'}" target="_blank" class="btn-claim" style="text-align:center; text-decoration:none; font-size:12px;">PASSPORT PDF</a>
            </div>`;
        
        // সিলেক্ট বক্সে বর্তমান স্ট্যাটাস সেট করা
        document.getElementById('statusSelect').value = d.status || "pending";
    }
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

// --- ৪. স্ট্যাটাস আপডেট ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;
    
    if (!window.currentAppId) return;

    btn.innerText = "Syncing...";
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "applications", window.currentAppId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
            handledBy: staffEmail.toLowerCase() // নিশ্চিত করা যে এটি এই স্টাফেরই আছে
        });
        alert("Success! Wallet Synced.");
        closeSlider();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "APPLY STATUS & SYNC WALLET";
        btn.disabled = false;
    }
};

// --- ৫. প্রোফাইল সেভ ---
const saveBtn = document.getElementById('saveProfileBtn');
if(saveBtn) {
    saveBtn.onclick = async () => {
        try {
            await updateDoc(doc(db, "users", staffEmail.toLowerCase()), {
                fullName: document.getElementById('profName').value,
                organization: document.getElementById('profOrg').value,
                experience: document.getElementById('profExp').value
            });
            alert("Profile Saved!");
        } catch (e) { alert(e.message); }
    };
}

// লগআউট
document.getElementById('logoutBtn').onclick = () => {
    if(confirm("Logout?")) { localStorage.clear(); location.href='index.html'; }
};

initStaff();
