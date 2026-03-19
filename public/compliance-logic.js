import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

let currentFileId = null;
let currentCommission = 0;
let loggedInStaff = "";

onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.replace("index.html");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().role === "compliance") {
        loggedInStaff = userDoc.data().fullName;
        document.getElementById('staffDisplay').innerText = loggedInStaff;
        document.getElementById('loader').style.display = 'none';
        initApp();
    } else {
        alert("Compliance Access Required!");
        signOut(auth).then(() => window.location.replace("index.html"));
    }
});

function initApp() {
    onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
        const tbody = document.getElementById('incomingTableBody');
        let html = "";
        let countServed = 0, countSuccess = 0;
        
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const id = dSnap.id;
            const handler = d.complianceMember || null;

            if (handler === loggedInStaff) countServed++;
            if (d.status === 'VISA_SUCCESS') countSuccess++;

            // Claim & Lock Logic
            let actionBtn = "";
            let rowStyle = "";

            if (!handler) {
                // Unclaimed
                actionBtn = `<button onclick="claimFile('${id}')" class="btn-claim" style="background:#2ecc71; color:white;">CLAIM</button>`;
            } else if (handler === loggedInStaff) {
                // Claimed by Current Staff
                actionBtn = `<button onclick="openReview('${id}', '${d.studentName}', ${d.commission || 0})" class="btn-claim">REVIEW</button>`;
                rowStyle = "background: rgba(241, 196, 15, 0.05);";
            } else {
                // Locked by others
                actionBtn = `<span style="color:#666; font-size:12px;"><i class="fas fa-lock"></i> Locked</span>`;
                rowStyle = "opacity: 0.5; pointer-events: none;";
            }

            html += `<tr style="${rowStyle}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><span style="color:var(--accent); font-size:12px;">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td><i class="fas fa-user-circle"></i> ${handler || 'Queue'}</td>
                <td>${actionBtn}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        document.getElementById('hTotal').innerText = countServed;
        document.getElementById('hSuccess').innerText = countSuccess;
    });
}

window.claimFile = async (id) => {
    if(!confirm("Claim this file for processing?")) return;
    try {
        await updateDoc(doc(db, "applications", id), {
            complianceMember: loggedInStaff,
            claimedAt: serverTimestamp()
        });
    } catch (e) { alert("Error claiming file!"); }
};

window.openReview = async (id, name, comm) => {
    currentFileId = id;
    currentCommission = Number(comm) || 0;
    document.getElementById('targetStudent').innerText = name;
    document.getElementById('targetComm').innerText = `Commission: ৳ ${currentCommission.toLocaleString()}`;
    
    const docSnap = await getDoc(doc(db, "applications", id));
    const docs = docSnap.data().docs || {};
    let dHtml = "";
    if(docs.academic) dHtml += `<a href="${docs.academic}" target="_blank" style="color:var(--accent); text-decoration:none; display:block; margin:10px 0;">📄 View Academic PDF</a>`;
    if(docs.passport) dHtml += `<a href="${docs.passport}" target="_blank" style="color:var(--accent); text-decoration:none; display:block; margin:10px 0;">🆔 View Passport PDF</a>`;
    document.getElementById('docLinksArea').innerHTML = dHtml || "No Documents Uploaded";

    document.getElementById('reviewSlider').classList.add('active');
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

document.getElementById('updateStatusBtn').onclick = async () => {
    const newStatus = document.getElementById('statusSelect').value;
    const btn = document.getElementById('updateStatusBtn');
    btn.disabled = true; btn.innerText = "Updating...";

    let updateData = {
        status: newStatus.toUpperCase(),
        updatedAt: serverTimestamp()
    };

    if (newStatus === "verified") updateData.commissionStatus = "pending";
    else if (newStatus === "visa_rejected") updateData.commissionStatus = "removed";
    else if (newStatus === "student_paid") updateData.commissionStatus = "ready";

    try {
        await updateDoc(doc(db, "applications", currentFileId), updateData);
        alert("Status & Wallet Synced!");
        closeSlider();
    } catch (e) { alert("Update failed!"); }
    btn.disabled = false; btn.innerText = "APPLY STATUS & SYNC WALLET";
};

document.getElementById('logoutBtn').onclick = () => signOut(auth);
