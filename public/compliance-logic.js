import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, setDoc, query, where, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// গ্লোবাল নেম ম্যাপিং
let staffNames = {};

// --- ১. স্টাফ প্রোফাইল ও নাম লোড করা ---
onSnapshot(doc(db, "staffs", staffEmail), (dSnap) => {
    const display = document.getElementById('staffDisplay');
    if (dSnap.exists()) {
        const d = dSnap.data();
        display.innerText = d.name || staffEmail; 
        document.getElementById('profName').value = d.name || "";
        document.getElementById('profOrg').value = d.org || "";
        document.getElementById('profExp').value = d.exp || "";
        staffNames[staffEmail] = d.name || staffEmail;
    } else {
        display.innerText = staffEmail;
    }
});

// --- ২. ইনকামিং অ্যাপ্লিকেশন ও স্ট্যাটস লোড করা ---
onSnapshot(collection(db, "applications"), async (snap) => {
    // সকল স্টাফের নাম আপডেট করা (হ্যান্ডলারের নাম দেখানোর জন্য)
    const staffQuery = await getDocs(collection(db, "staffs"));
    staffQuery.forEach(sd => staffNames[sd.id] = sd.data().name || sd.id);

    const tbody = document.getElementById('incomingTableBody');
    tbody.innerHTML = "";
    
    let totalServed = 0;
    let visaSuccess = 0;
    let partnersSet = new Set();

    snap.forEach(dSnap => {
        const d = dSnap.data();
        const id = dSnap.id;

        if(d.handledBy === staffEmail) {
            totalServed++;
            if(d.status === 'visa_success') visaSuccess++;
            partnersSet.add(d.partnerEmail);
        }

        // ৪টি ডকের শর্টকাট লিঙ্ক
        const ds = d.docs || {};
        let docLinks = "";
        if(ds.academic) docLinks += `<a href="${ds.academic}" target="_blank" style="color:var(--accent); margin-right:5px;">[A]</a>`;
        if(ds.language) docLinks += `<a href="${ds.language}" target="_blank" style="color:var(--accent); margin-right:5px;">[L]</a>`;
        if(ds.passport) docLinks += `<a href="${ds.passport}" target="_blank" style="color:var(--accent); margin-right:5px;">[P]</a>`;
        if(ds.others) docLinks += `<a href="${ds.others}" target="_blank" style="color:var(--accent);">[O]</a>`;

        const handlerName = staffNames[d.handledBy] || d.handledBy || 'Unclaimed';

        tbody.innerHTML += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail || 'No Email'}</small></td>
                <td>${d.passportNo}</td>
                <td>${docLinks || 'No Files'}</td>
                <td><span class="status-pill ${d.status}">${d.status.toUpperCase()}</span></td>
                <td><i class="fas fa-user-check" style="font-size:10px;"></i> ${handlerName}</td>
                <td><button class="btn-claim" onclick="openReview('${id}', '${d.studentName}', '${d.commission}')">Review</button></td>
            </tr>`;
    });

    document.getElementById('hTotal').innerText = totalServed;
    document.getElementById('hSuccess').innerText = visaSuccess;
    document.getElementById('hPartners').innerText = partnersSet.size;
});

// --- ৩. রিভিউ স্লাইডার ফাংশন (উইন্ডো অবজেক্টে বাইন্ড করা হয়েছে) ---
window.openReview = async (id, sName, comm) => {
    window.currentAppId = id;
    document.getElementById('targetStudent').innerText = sName;
    document.getElementById('targetComm').innerText = `Commission: ৳${Number(comm).toLocaleString()}`;
    
    // স্লাইডারে ডক লিঙ্ক রেন্ডার করা
    const appSnap = await getDoc(doc(db, "applications", id));
    const d = appSnap.data().docs || {};
    const area = document.getElementById('docLinksArea');
    area.innerHTML = `
        <p style="font-size:12px; margin-bottom:10px; color:#aaa;">Check All PDF Documents:</p>
        ${d.academic ? `<a href="${d.academic}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:8px; font-size:10px; background:#f1c40f; color:black; text-decoration:none; border-radius:5px;">Academic Doc</a>` : ''}
        ${d.language ? `<a href="${d.language}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:8px; font-size:10px; background:#f1c40f; color:black; text-decoration:none; border-radius:5px;">Language Doc</a>` : ''}
        ${d.passport ? `<a href="${d.passport}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:8px; font-size:10px; background:#f1c40f; color:black; text-decoration:none; border-radius:5px;">Passport Copy</a>` : ''}
        ${d.others ? `<a href="${d.others}" target="_blank" class="btn-gold" style="display:inline-block; margin:5px; padding:8px; font-size:10px; background:#f1c40f; color:black; text-decoration:none; border-radius:5px;">Other Files</a>` : ''}
    `;

    document.getElementById('reviewSlider').classList.add('open');
};

window.closeSlider = () => {
    document.getElementById('reviewSlider').classList.remove('open');
};

// --- ৪. স্ট্যাটাস আপডেট ও ওয়ালেট সিঙ্ক ---
document.getElementById('updateStatusBtn').onclick = async () => {
    const btn = document.getElementById('updateStatusBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const appRef = doc(db, "applications", window.currentAppId);
    
    btn.innerText = "Syncing..."; btn.disabled = true;

    try {
        const appSnap = await getDoc(appRef);
        const appData = appSnap.data();
        let commStatus = appData.commissionStatus || "waiting";

        if (newStatus === "verified") commStatus = "pending";
        else if (newStatus === "student_paid") commStatus = "ready";
        else if (newStatus === "visa_rejected" || newStatus === "doc_missing") commStatus = "waiting";

        await updateDoc(appRef, {
            status: newStatus,
            commissionStatus: commStatus,
            handledBy: staffEmail,
            updatedAt: serverTimestamp()
        });

        alert("Database & Wallet Synced Successfully!");
        closeSlider();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "APPLY STATUS & SYNC WALLET"; btn.disabled = false;
    }
};

// --- প্রোফাইল সেভ ---
document.getElementById('saveProfileBtn').onclick = async () => {
    await setDoc(doc(db, "staffs", staffEmail), {
        name: document.getElementById('profName').value,
        org: document.getElementById('profOrg').value,
        exp: document.getElementById('profExp').value,
        email: staffEmail
    }, { merge: true });
    alert("Staff Profile Updated!");
};

// --- লগআউট ও লোডার ---
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    location.href = 'index.html';
};

window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 800);
});
