import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// ১. অথেনটিকেশন এবং প্রোফাইল লোড
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().status === "approved") {
            const data = userDoc.data();
            document.getElementById('userName').innerText = data.fullName;
            document.getElementById('pFullName').value = data.fullName || "";
            document.getElementById('pCompanyName').value = data.companyName || "";
            document.getElementById('pPhone').value = data.phone || "";
            document.getElementById('pAddress').value = data.address || "";
            initWalletListener(user.uid);
            loadFileTracking(user.uid);
        } else {
            signOut(auth);
            window.location.replace("index.html");
        }
    } else {
        window.location.replace("index.html");
    }
});

// ২. প্রোফাইল আপডেট
window.updateProfile = async () => {
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            fullName: document.getElementById('pFullName').value,
            companyName: document.getElementById('pCompanyName').value,
            phone: document.getElementById('pPhone').value,
            address: document.getElementById('pAddress').value
        });
        alert("Profile Updated!");
    } catch (e) { alert(e.message); }
};

// ৩. স্মার্ট অ্যাসেসমেন্ট (STRICT FILTERING)
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLangType').value;
    
    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('assessmentResults').style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };
        let found = 0;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            
            // ফিল্টার লজিক: সব সিলেক্টেড শর্ত মিললে তবেই শো করবে
            const matchC = !country || u.country.toLowerCase().includes(country);
            const matchD = !degree || (u.degree && u.degree.toUpperCase() === degree.toUpperCase());
            const matchL = !lang || (u.acceptedEnglish && u.acceptedEnglish.toUpperCase().includes(lang.toUpperCase()));

            if (matchC && matchD && matchL) {
                found++;
                const rate = rates[u.currency] || 120;
                const commission = (parseFloat(u.semesterFee) * rate * parseFloat(u.partnerCommPercent)) / 100;

                rows += `<tr>
                    <td>${u.name}</td><td>${u.country}</td><td>${u.intake}</td>
                    <td>${u.currency || '$'} ${u.semesterFee}</td>
                    <td style="color:#00ff00">৳ ${Math.round(commission).toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApp('${u.name}', ${commission})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = found > 0 ? rows : "<tr><td colspan='6' style='text-align:center; color:red;'>No matching university found.</td></tr>";
    });
};

// ৪. ফাইল ওপেন এবং কিউআর স্লিপ
let selectedUniCommission = 0;
window.openApp = (uniName, comm) => {
    document.getElementById('mTitle').innerText = uniName;
    selectedUniCommission = comm;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;

    if (!name || !pass) return alert("Student Name & Passport Required!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, contactNo: document.getElementById('sPhone').value,
            passportNo: pass, university: uni, status: "Pending",
            partnerUID: auth.currentUser.uid, partnerName: document.getElementById('userName').innerText,
            commissionBDT: selectedUniCommission, pendingAmount: 0, finalAmount: 0,
            timestamp: new Date().toISOString(), dateTime: new Date().toLocaleString()
        });
        
        document.getElementById('appModal').style.display = 'none';
        
        // QR Code Generation
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('qrImg').src = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(name + "|" + pass + "|" + uni)}`;
        
        setTimeout(() => { window.print(); }, 1000);
    } catch (e) { alert(e.message); }
};

// ৫. ওয়ালেট এবং ট্র্যাকিং
function initWalletListener(uid) {
    onSnapshot(query(collection(db, "applications"), where("partnerUID", "==", uid)), (snap) => {
        let tp = 0, tf = 0;
        snap.forEach(d => { tp += parseFloat(d.data().pendingAmount || 0); tf += parseFloat(d.data().finalAmount || 0); });
        document.getElementById('pendingWalletBox').innerText = `৳ ${Math.round(tp).toLocaleString()}`;
        document.getElementById('finalWalletBox').innerText = `৳ ${Math.round(tf).toLocaleString()}`;
        document.getElementById('finalWalletDisplay').innerText = `৳ ${Math.round(tf).toLocaleString()}`;
        document.getElementById('withdrawBtn').disabled = tf <= 0;
    });
}

function loadFileTracking(uid) {
    onSnapshot(query(collection(db, "applications"), where("partnerUID", "==", uid), orderBy("timestamp", "desc")), (snap) => {
        let html = "";
        snap.forEach(d => {
            const data = d.data();
            html += `<tr><td>${data.studentName}</td><td>${data.passportNo}</td><td style="color:var(--gold)">${data.status}</td><td>Unassigned</td><td>${data.dateTime}</td></tr>`;
        });
        document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
    });
}

// উইথড্র
window.openWithdrawModal = () => document.getElementById('withdrawModal').style.display = 'flex';
document.getElementById('confirmWithdrawBtn').onclick = async () => {
    await addDoc(collection(db, "withdrawals"), {
        partnerUID: auth.currentUser.uid, amount: document.getElementById('wAmount').value,
        method: document.getElementById('wMethod').value, accountNo: document.getElementById('wAccNo').value,
        status: "Pending", timestamp: new Date().toISOString()
    });
    alert("Request Sent!");
    document.getElementById('withdrawModal').style.display = 'none';
};

document.getElementById('logoutBtn').onclick = () => signOut(auth);