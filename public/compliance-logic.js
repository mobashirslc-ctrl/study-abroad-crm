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

// Auth Protection
onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.replace("index.html");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && (userDoc.data().role === "compliance" || userDoc.data().role === "admin")) {
        loggedInStaff = userDoc.data().fullName;
        document.getElementById('staffDisplay').innerText = loggedInStaff;
        document.getElementById('loader').style.display = 'none';
        initApp();
    } else {
        alert("Compliance Access Denied!");
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

            // Doc View Button
            const docs = d.docs || {};
            let docBtn = `<button onclick="viewDocs('${docs.academic}', '${docs.passport}')" class="btn-claim" style="background:#3498db; font-size:11px; padding:5px 10px;">VIEW PDF</button>`;
            if(!docs.academic && !docs.passport) docBtn = `<span style="color:#666; font-size:11px;">No Docs</span>`;

            // Claim & Action Logic
            let actionBtn = "";
            let rowStyle = "";

            if (!handler) {
                actionBtn = `<button onclick="claimFile('${id}')" class="btn-claim" style="background:#2ecc71;">CLAIM</button>`;
            } else if (handler === loggedInStaff) {
                actionBtn = `<button onclick="openReview('${id}', '${d.studentName}', ${d.commission || 0})" class="btn-claim">REVIEW</button>`;
                rowStyle = "background: rgba(241, 196, 15, 0.1);";
            } else {
                actionBtn = `<span style="color:#777; font-size:12px;"><i class="fas fa-lock"></i> Locked</span>`;
                rowStyle = "opacity: 0.5; pointer-events: none;";
            }

            html += `<tr style="${rowStyle}">
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td>${docBtn}</td>
                <td><span style="color:var(--accent); font-size:12px;">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td><i class="fas fa-user-circle"></i> ${handler || 'Queue'}</td>
                <td>${actionBtn}</td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="6" align="center">No files in queue</td></tr>';
        document.getElementById('hTotal').innerText = countServed;
        document.getElementById('hSuccess').innerText = countSuccess;
    });
}

// Global View Docs Function
window.viewDocs = (acad, pass) => {
    if (acad && acad !== "undefined") window.open(acad, '_blank');
    if (pass && pass !== "undefined") window.open(pass, '_blank');
    if (!acad && !pass) alert("No documents uploaded for this student.");
};

window.claimFile = async (id) => {
    if(!confirm("Claim this file for processing?")) return;
    try {
        await updateDoc(doc(db, "applications", id), {
            complianceMember: loggedInStaff,
            claimedAt: serverTimestamp()
        });
    } catch (e) { alert("Claim failed!"); }
};

window.openReview = async (id, name, comm) => {
    currentFileId = id;
    currentCommission = Number(comm) || 0;
    document.getElementById('targetStudent').innerText = name;
    document.getElementById('targetComm').innerText = `Commission: ৳ ${currentCommission.toLocaleString()}`;
    
    const docSnap = await getDoc(doc(db, "applications", id));
    const docs = docSnap.data().docs || {};
    let dHtml = "";
    if(docs.academic) dHtml += `<a href="${docs.academic}" target="_blank" style="color:var(--accent); text-decoration:none; display:block; margin-bottom:10px;">📄 View Academic Record</a>`;
    if(docs.passport) dHtml += `<a href="${docs.passport}" target="_blank" style="color:var(--accent); text-decoration:none; display:block;">🆔 View Passport Copy</a>`;
    document.getElementById('docLinksArea').innerHTML = dHtml || "No Documents Available";

    document.getElementById('reviewSlider').classList.add('active');
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

document.getElementById('updateStatusBtn').onclick = async () => {
    const newStatus = document.getElementById('statusSelect').value;
    const btn = document.getElementById('updateStatusBtn');
    btn.disabled = true; btn.innerText = "Syncing Wallet...";

    let updateData = {
        status: newStatus.toUpperCase(),
        updatedAt: serverTimestamp()
    };

    if (newStatus === "verified") updateData.commissionStatus = "pending";
    else if (newStatus === "visa_rejected") updateData.commissionStatus = "removed";
    else if (newStatus === "student_paid") updateData.commissionStatus = "ready";

    try {
        await updateDoc(doc(db, "applications", currentFileId), updateData);
        alert("Status Updated Successfully!");
        closeSlider();
    } catch (e) { alert("Update failed!"); }
    btn.disabled = false; btn.innerText = "APPLY STATUS & SYNC WALLET";
};

document.getElementById('logoutBtn').onclick = () => signOut(auth).then(()=> window.location.replace("index.html"));
