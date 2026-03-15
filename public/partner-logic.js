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
            
            // প্রোফাইল ফিল্ডস পূরণ করা
            if(document.getElementById('pFullName')) {
                document.getElementById('pFullName').value = data.fullName || "";
                document.getElementById('pCompanyName').value = data.companyName || "";
                document.getElementById('pPhone').value = data.phone || "";
                document.getElementById('pAddress').value = data.address || "";
            }
            
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
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            fullName: document.getElementById('pFullName').value,
            companyName: document.getElementById('pCompanyName').value,
            phone: document.getElementById('pPhone').value,
            address: document.getElementById('pAddress').value
        });
        alert("Profile Saved!");
    } catch (e) { alert(e.message); }
};

// ৩. স্মার্ট অ্যাসেসমেন্ট (ম্যাচিং লজিক)
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLangType').value;
    
    const resultsArea = document.getElementById('assessmentResults');
    const tbody = document.getElementById('uniResultsBody');
    resultsArea.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Checking Requirements...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };
        
        snap.forEach(docSnap => {
            const u = docSnap.data();
            
            // STRICT MATCHING: রিকোয়ারমেন্ট না মিললে শো করবে না
            const countryMatch = !country || u.country.toLowerCase().includes(country);
            const degreeMatch = !degree || (u.degree && u.degree.toUpperCase() === degree.toUpperCase());
            const langMatch = !lang || (u.acceptedEnglish && u.acceptedEnglish.toUpperCase().includes(lang.toUpperCase()));

            if (countryMatch && degreeMatch && langMatch) {
                const currentRate = rates[u.currency] || 120;
                const commissionBDT = (parseFloat(u.semesterFee) * currentRate * parseFloat(u.partnerCommPercent)) / 100;

                rows += `<tr>
                    <td>${u.name}</td><td>${u.country}</td><td>${u.intake}</td>
                    <td>${u.currency || '$'} ${u.semesterFee}</td>
                    <td style="color:#00ff00">৳ ${Math.round(commissionBDT).toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApp('${u.name}', ${commissionBDT})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || "<tr><td colspan='6' style='text-align:center; color:#ff5e5e;'>No Universities match your requirements.</td></tr>";
    });
};

// ৪. ফাইল ওপেন এবং সাবমিট
let selectedUniCommission = 0;
window.openApp = (uniName, commAmount) => {
    document.getElementById('mTitle').innerText = uniName;
    selectedUniCommission = commAmount;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const btn = document.getElementById('submitBtn');
    if (!name) return alert("Student name is required!");

    try {
        btn.disabled = true;
        btn.innerText = "Uploading Documents...";
        
        await addDoc(collection(db, "applications"), {
            studentName: name,
            contactNo: document.getElementById('sPhone').value,
            passportNo: document.getElementById('sPass').value,
            university: document.getElementById('mTitle').innerText,
            status: "Pending",
            complianceMember: "Unassigned",
            partnerUID: auth.currentUser.uid,
            partnerName: document.getElementById('userName').innerText,
            commissionBDT: selectedUniCommission,
            pendingAmount: 0,
            finalAmount: 0,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });
        
        alert("Application Submitted Successfully!");
        document.getElementById('appModal').style.display = 'none';
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; btn.innerText = "Submit Application"; }
};

// ৫. ওয়ালেট এবং ফাইল ট্র্যাকিং লিসেনার
function initWalletListener(uid) {
    const q = query(collection(db, "applications"), where("partnerUID", "==", uid));
    onSnapshot(q, (snap) => {
        let totalP = 0, totalF = 0;
        snap.forEach(d => {
            const data = d.data();
            totalP += parseFloat(data.pendingAmount || 0);
            totalF += parseFloat(data.finalAmount || 0);
        });
        document.getElementById('pendingWalletBox').innerText = `৳ ${Math.round(totalP).toLocaleString()}`;
        document.getElementById('finalWalletBox').innerText = `৳ ${Math.round(totalF).toLocaleString()}`;
        document.getElementById('finalWalletDisplay').innerText = `৳ ${Math.round(totalF).toLocaleString()}`;
        
        const wBtn = document.getElementById('withdrawBtn');
        wBtn.disabled = totalF <= 0;
    });
}

function loadFileTracking(uid) {
    const q = query(collection(db, "applications"), where("partnerUID", "==", uid), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(d => {
            const data = d.data();
            html += `<tr>
                <td>${data.studentName}</td><td>${data.passportNo}</td>
                <td style="color:var(--gold)">${data.status}</td>
                <td>${data.complianceMember}</td><td>${data.dateTime}</td>
            </tr>`;
        });
        document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
    });
}

// ৬. উইথড্রয়াল সাবমিশন
window.openWithdrawModal = () => document.getElementById('withdrawModal').style.display = 'flex';
document.getElementById('confirmWithdrawBtn').onclick = async () => {
    const amount = parseFloat(document.getElementById('wAmount').value);
    if (!amount || amount <= 0) return alert("Invalid amount!");

    try {
        await addDoc(collection(db, "withdrawals"), {
            partnerUID: auth.currentUser.uid,
            partnerName: document.getElementById('userName').innerText,
            amount: amount,
            method: document.getElementById('wMethod').value,
            accountNo: document.getElementById('wAccNo').value,
            status: "Pending",
            timestamp: new Date().toISOString()
        });
        alert("Withdrawal requested!");
        document.getElementById('withdrawModal').style.display = 'none';
    } catch (e) { alert(e.message); }
};

document.getElementById('logoutBtn').onclick = () => signOut(auth);