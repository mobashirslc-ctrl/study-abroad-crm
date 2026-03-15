import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().status === "approved") {
            document.getElementById('userName').innerText = userDoc.data().fullName;
            if(document.getElementById('profileName')) document.getElementById('profileName').innerText = userDoc.data().fullName;
            initWalletListener(user.uid);
        } else {
            await signOut(auth);
            window.location.replace("index.html");
        }
    } else {
        if (!window.location.pathname.includes("index.html")) window.location.replace("index.html");
    }
});

// স্মার্ট অ্যাসেসমেন্ট
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const resultsArea = document.getElementById('assessmentResults');
    const tbody = document.getElementById('uniResultsBody');
    resultsArea.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='12' style='text-align:center;'>Searching...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const currentRate = rates[u.currency] || 120;
            const semesterFeeRaw = parseFloat(u.semesterFee) || 0;
            const commPercent = parseFloat(u.partnerCommPercent) || 0;
            const commissionAmountBDT = (semesterFeeRaw * currentRate * commPercent) / 100;

            if (!country || u.country.toLowerCase().includes(country)) {
                rows += `<tr>
                    <td>${u.name}</td><td>${u.country}</td><td>${u.intake}</td>
                    <td>${u.currency || '$'} ${semesterFeeRaw}</td>
                    <td style="color:#00ff00">৳ ${Math.round(commissionAmountBDT).toLocaleString()}</td>
                    <td>${u.initialPayment}</td><td>${u.scholarship}</td><td>View</td>
                    <td>${u.englishScore}</td><td>${u.casTime}</td><td>High</td>
                    <td><button class="btn-gold" onclick="openApp('${u.name}', ${commissionAmountBDT})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || "<tr><td colspan='12'>No Matching Data</td></tr>";
    });
};

let selectedUniCommission = 0;
window.openApp = (uniName, commAmount) => {
    document.getElementById('mTitle').innerText = uniName;
    selectedUniCommission = commAmount;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const btn = document.getElementById('submitBtn');
    if (!name) return alert("Fill all info!");

    try {
        btn.disabled = true;
        await addDoc(collection(db, "applications"), {
            studentName: name,
            contactNo: document.getElementById('sPhone').value,
            passportNo: document.getElementById('sPass').value,
            university: document.getElementById('mTitle').innerText,
            status: "Pending",
            complianceMember: "Unassigned",
            partnerUID: auth.currentUser.uid,
            commissionBDT: selectedUniCommission,
            pendingAmount: 0,
            finalAmount: 0,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });
        alert("Submitted!");
        document.getElementById('appModal').style.display = 'none';
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; }
};

// ওয়ালেট লিসেনার (FIXED)
function initWalletListener(uid) {
    const q = query(collection(db, "applications"), where("partnerUID", "==", uid));
    onSnapshot(q, (snap) => {
        let totalPending = 0;
        let totalFinal = 0;
        snap.forEach(docSnap => {
            const d = docSnap.data();
            totalPending += parseFloat(d.pendingAmount || 0);
            totalFinal += parseFloat(d.finalAmount || 0);
        });

        // ড্যাশবোর্ড বক্স আপডেট
        if(document.getElementById('pendingWalletBox')) 
            document.getElementById('pendingWalletBox').innerText = `৳ ${Math.round(totalPending).toLocaleString()}`;
        
        if(document.getElementById('finalWalletBox')) 
            document.getElementById('finalWalletBox').innerText = `৳ ${Math.round(totalFinal).toLocaleString()}`;

        // ওয়ালেট ট্যাব আপডেট
        if(document.getElementById('finalWalletDisplay'))
            document.getElementById('finalWalletDisplay').innerText = `৳ ${Math.round(totalFinal).toLocaleString()}`;
            
        const wBtn = document.getElementById('withdrawBtn');
        if(wBtn) {
            wBtn.disabled = totalFinal <= 0;
            wBtn.style.opacity = totalFinal <= 0 ? "0.5" : "1";
        }
    });
}

// ফাইল ট্র্যাকিং লিস্ট
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if(d.partnerUID === auth.currentUser?.uid) {
            html += `<tr><td>${d.studentName}</td><td>${d.contactNo}</td><td>${d.passportNo}</td>
                    <td><span style="color:var(--gold)">${d.status}</span></td><td>${d.complianceMember}</td><td>${d.dateTime}</td></tr>`;
        }
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
});

document.getElementById('logoutBtn').onclick = () => signOut(auth);