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

// Auth & Role Protection
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
    // Load Incoming Files
    onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
        const tbody = document.getElementById('incomingTableBody');
        let html = "";
        let countServed = 0, countSuccess = 0;
        
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const id = dSnap.id;
            if (d.complianceMember === loggedInStaff) countServed++;
            if (d.status === 'VISA_SUCCESS') countSuccess++;

            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><button onclick="viewDocs('${id}')" class="btn-claim" style="padding:5px 10px;">Docs</button></td>
                <td><span style="color:var(--accent)">${(d.status || 'PENDING').toUpperCase()}</span></td>
                <td>${d.complianceMember || 'Waiting...'}</td>
                <td><button onclick="openReview('${id}', '${d.studentName}', ${d.commission || 0})" class="btn-claim">Review</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
        document.getElementById('hTotal').innerText = countServed;
        document.getElementById('hSuccess').innerText = countSuccess;
    });
}

window.openReview = async (id, name, comm) => {
    currentFileId = id;
    currentCommission = Number(comm) || 0;
    document.getElementById('targetStudent').innerText = name;
    document.getElementById('targetComm').innerText = `Commission: ৳ ${currentCommission.toLocaleString()}`;
    
    // Show Doc Links
    const docSnap = await getDoc(doc(db, "applications", id));
    const docs = docSnap.data().docs || {};
    let dHtml = "";
    if(docs.academic) dHtml += `<a href="${docs.academic}" target="_blank" style="color:white;">📄 Academic PDF</a><br>`;
    if(docs.passport) dHtml += `<a href="${docs.passport}" target="_blank" style="color:white;">🆔 Passport PDF</a>`;
    document.getElementById('docLinksArea').innerHTML = dHtml || "No Documents Uploaded";

    document.getElementById('reviewSlider').classList.add('active');
};

window.closeSlider = () => document.getElementById('reviewSlider').classList.remove('active');

document.getElementById('updateStatusBtn').onclick = async () => {
    const newStatus = document.getElementById('statusSelect').value;
    const btn = document.getElementById('updateStatusBtn');
    btn.disabled = true; btn.innerText = "Syncing...";

    let updateData = {
        status: newStatus.toUpperCase(),
        complianceMember: loggedInStaff,
        updatedAt: serverTimestamp()
    };

    // --- CRITICAL WALLET SYNC LOGIC ---
    if (newStatus === "verified") {
        updateData.commissionStatus = "pending"; // Partner er pending wallet e add hobe
    } else if (newStatus === "visa_rejected") {
        updateData.commissionStatus = "removed"; // Pending theke minus hobe
    } else if (newStatus === "student_paid") {
        updateData.commissionStatus = "ready"; // Final balance e jabe, withdraw active hobe
    }

    try {
        await updateDoc(doc(db, "applications", currentFileId), updateData);
        alert("Wallet & Status Updated!");
        closeSlider();
    } catch (e) { alert("Error!"); }
    btn.disabled = false; btn.innerText = "APPLY STATUS & SYNC WALLET";
};

document.getElementById('logoutBtn').onclick = () => signOut(auth);
