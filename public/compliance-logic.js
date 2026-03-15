import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentActiveId = null;
let currentCommission = 0;
let staffName = "STAFF_ADMIN"; // ডিফল্ট নাম

// ২. স্টাফ অথেনটিকেশন এবং প্রোফাইল চেক
onAuthStateChanged(auth, (user) => {
    if (user) {
        staffName = user.email.split('@')[0].toUpperCase();
        document.getElementById('staffDisplay').innerText = staffName;
        if(document.getElementById('staffProfileDetail')) {
            document.getElementById('staffProfileDetail').innerText = `Username: ${user.email}\nAccess Level: Compliance Officer`;
        }
    } else {
        // লগইন না থাকলে ইনডেক্সে পাঠিয়ে দেবে
        window.location.href = "index.html"; 
    }
});

// ৩. ইনকামিং ফাইল কিউ (Real-time Queue)
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if(!tbody) return;
    
    let html = "";
    snap.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        // ফাইলটি কি অন্য কেউ ক্লেইম করেছে?
        const isClaimed = data.complianceMember && data.complianceMember !== "Unassigned";
        const isMine = data.complianceMember === staffName;

        html += `
            <tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.partnerName || 'Unknown Agency'}</td>
                <td>
                    <span style="color:${isClaimed ? 'var(--success)' : 'var(--accent)'}; font-size: 0.8rem; font-weight: bold;">
                        <i class="fas fa-circle" style="font-size:0.6rem"></i> ${data.status || 'NEW'}
                    </span>
                </td>
                <td>${isClaimed ? `<i class="fas fa-user-shield"></i> ${data.complianceMember}` : '<span style="opacity:0.5">Unclaimed</span>'}</td>
                <td>
                    ${!isClaimed ? 
                        `<button class="btn-claim" onclick="claimFile('${id}')">Claim File</button>` : 
                        (isMine ? 
                            `<button class="btn-claim" style="background:#fff; color:#000;" onclick="openReviewSlider('${id}', '${data.studentName}', '${data.partnerName}', ${data.commissionBDT || 0})">Review & Decision</button>` : 
                            `<button class="btn-locked" disabled><i class="fas fa-lock"></i> Locked</button>`
                        )
                    }
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='5' style='text-align:center;'>No files in queue.</td></tr>";
});

// ৪. ক্লেইম ফাইল ফাংশন
window.claimFile = async (id) => {
    try {
        await updateDoc(doc(db, "applications", id), {
            complianceMember: staffName,
            status: "IN REVIEW"
        });
        alert("File locked to your ID. You can now proceed with the review.");
    } catch (e) {
        alert("Error claiming file: " + e.message);
    }
};

// ৫. রিভিউ স্লাইডার কন্ট্রোল
window.openReviewSlider = (id, name, partner, comm) => {
    currentActiveId = id;
    currentCommission = comm;
    document.getElementById('reviewingStudent').innerText = name;
    document.getElementById('reviewingPartner').innerText = "Partner: " + (partner || "N/A");
    document.getElementById('slider').classList.add('active');
};

window.closeSlider = () => {
    document.getElementById('slider').classList.remove('active');
};

// ৬. স্মার্ট স্ট্যাটাস ও ওয়ালেট আপডেট লজিক
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const btn = document.getElementById('applyStatusBtn');
    
    let updateData = { 
        status: selectedStatus.toUpperCase(),
        lastUpdatedBy: staffName,
        updateTime: new Date().toISOString()
    };

    // ওয়ালেট রুলস (Logic Connection)
    if (selectedStatus === "verified") {
        // Verified হলে পেন্ডিং ওয়ালেটে টাকা ঢুকবে
        updateData.walletStatus = "pending";
        updateData.pendingAmount = currentCommission;
        updateData.finalAmount = 0;
    } 
    else if (selectedStatus === "fees") {
        // Fees Paid হলে পেন্ডিং থেকে কেটে ফাইনাল ব্যালেন্সে যাবে
        updateData.walletStatus = "final";
        updateData.pendingAmount = 0;
        updateData.finalAmount = currentCommission;
    } 
    else if (selectedStatus === "rejected" || selectedStatus === "refund") {
        // বাতিল হলে ওয়ালেট পরিষ্কার (Zero) হয়ে যাবে
        updateData.walletStatus = "none";
        updateData.pendingAmount = 0;
        updateData.finalAmount = 0;
    }

    try {
        btn.innerText = "Syncing with Wallet...";
        btn.disabled = true;
        
        await updateDoc(doc(db, "applications", currentActiveId), updateData);
        
        alert("Success! Status updated and Partner's wallet adjusted.");
        closeSlider();
    } catch (e) {
        alert("Update Failed: " + e.message);
    } finally {
        btn.innerText = "Apply & Lock Assignment";
        btn.disabled = false;
    }
};

// ৭. ট্যাব এবং মেনু কন্ট্রোল
window.openTab = (tabId) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active-section');
    document.getElementById('nav-' + tabId).classList.add('active');
};

// ৮. লগআউট
document.getElementById('logoutBtn').onclick = () => {
    if(confirm("Logout from staff dashboard?")) {
        signOut(auth).then(() => window.location.href = "index.html");
    }
};