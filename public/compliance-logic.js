import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
let staffName = "Compliance Member";

// ১. অথেনটিকেশন চেক
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && (userDoc.data().role === "compliance" || userDoc.data().role === "admin")) {
            staffName = userDoc.data().fullName;
            document.getElementById('staffNameDisplay').innerText = staffName;
        } else {
            alert("Unauthorized Access!");
            window.location.replace("index.html");
        }
    } else {
        window.location.replace("index.html");
    }
});

// ২. রিয়েল-টাইম অ্যাপ্লিকেশন লিস্ট লোড
const loadApplications = () => {
    const q = query(collection(db, "applications"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            
            html += `
            <tr onclick="openStatusSlider('${id}', '${d.studentName}', ${d.commissionBDT || 0})" style="cursor:pointer">
                <td>${d.studentName}</td>
                <td>${d.university}</td>
                <td><span class="status-badge ${d.status.toLowerCase()}">${d.status}</span></td>
                <td>${d.complianceMember}</td>
                <td>৳ ${Math.round(d.commissionBDT || 0).toLocaleString()}</td>
                <td>${d.dateTime}</td>
            </tr>`;
        });
        document.getElementById('complianceTableBody').innerHTML = html;
    });
};

// ৩. স্ট্যাটাস স্লাইডার ওপেন করা
window.openStatusSlider = (id, name, commission) => {
    currentActiveId = id;
    currentCommission = commission;
    document.getElementById('targetStudent').innerText = name;
    document.getElementById('targetComm').innerText = `Commission: ৳ ${commission.toLocaleString()}`;
    document.getElementById('statusSlider').style.right = "0";
};

window.closeSlider = () => {
    document.getElementById('statusSlider').style.right = "-400px";
};

// ৪. স্ট্যাটাস আপডেট ও ওয়ালেট সিঙ্ক লজিক (CRITICAL PART)
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const btn = document.getElementById('applyStatusBtn');
    
    // ডাটাবেজ আপডেট অবজেক্ট
    let updateData = { 
        status: selectedStatus.toUpperCase(),
        complianceMember: staffName,
        lastUpdated: new Date().toISOString()
    };

    // --- ওয়ালেট ক্যালকুলেশন লজিক ---
    if (selectedStatus === "verified") {
        // ফাইল ভেরিফাইড হলে টাকা পেন্ডিং ওয়ালেটে যাবে
        updateData.pendingAmount = currentCommission;
        updateData.finalAmount = 0;
    } 
    else if (selectedStatus === "fees_paid") {
        // টিউশন ফি পেইড হলে পেন্ডিং থেকে কেটে ফাইনালে যাবে
        updateData.pendingAmount = 0;
        updateData.finalAmount = currentCommission;
    } 
    else if (selectedStatus === "rejected" || selectedStatus === "refund") {
        // রিজেক্ট হলে সব জিরো
        updateData.pendingAmount = 0;
        updateData.finalAmount = 0;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Syncing Wallet...";
        
        await updateDoc(doc(db, "applications", currentActiveId), updateData);
        
        alert("Status Updated & Wallet Synced!");
        closeSlider();
    } catch (e) {
        alert("Error updating: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Apply Status & Update Wallet";
    }
};

loadApplications();