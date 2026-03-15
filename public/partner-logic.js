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

// ১. অথেনটিকেশন ও প্রোফাইল ডাটা লোড
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().status === "approved") {
            document.getElementById('userName').innerText = userDoc.data().fullName;
            if(document.getElementById('profileName')) document.getElementById('profileName').innerText = userDoc.data().fullName;
            
            // ওয়ালেট আপডেট শুরু করা
            initWalletListener(user.uid);
        } else {
            await signOut(auth);
            window.location.replace("index.html");
        }
    } else {
        if (!window.location.pathname.includes("index.html")) window.location.replace("index.html");
    }
});

// ২. স্মার্ট অ্যাসেসমেন্ট (ইউনিভার্সিটি সার্চ ও কমিশন ক্যালকুলেশন)
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

            const feeInBDT = semesterFeeRaw * currentRate;
            const commissionAmountBDT = (feeInBDT * commPercent) / 100;

            let isMatch = true;
            if (country && !u.country.toLowerCase().includes(country)) isMatch = false;

            if (isMatch) {
                rows += `
                <tr>
                    <td style="color:var(--gold); font-weight:bold">${u.name}</td>
                    <td>${u.country}</td>
                    <td>${u.intake}</td>
                    <td>${u.currency || '$'} ${semesterFeeRaw.toLocaleString()}</td>
                    <td style="background:rgba(0,255,0,0.1); color:#00ff00; font-weight:bold;">
                        ৳ ${Math.round(commissionAmountBDT).toLocaleString()}
                    </td>
                    <td>${u.initialPayment || 'N/A'}</td>
                    <td>${u.scholarship || 'N/A'}</td>
                    <td>${u.entry || 'View'}</td>
                    <td>${u.englishScore || 'N/A'}</td>
                    <td>${u.casTime || 'N/A'}</td>
                    <td style="color:#00ff00">${u.successRate || 'High'}</td>
                    <td>
                        <button class="btn-gold" style="padding:6px 12px; font-size:10px;" onclick="openApp('${u.name}', ${commissionAmountBDT})">Open File</button>
                    </td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || "<tr><td colspan='12'>No Matching Data</td></tr>";
    });
};

// ৩. ফাইল সাবমিশন লজিক (কমিশন সহ সেভ করা)
let selectedUniCommission = 0; // গ্লোবাল ভেরিয়েবল কমিশন ট্র্যাক করার জন্য

window.openApp = (uniName, commAmount) => {
    document.getElementById('mTitle').innerText = uniName;
    selectedUniCommission = commAmount; // কমিশন ভ্যালু স্টোর করা
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const phone = document.getElementById('sPhone').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;
    const btn = document.getElementById('submitBtn');

    if (!name || !phone || !pass) return alert("Fill all info!");

    try {
        btn.disabled = true;
        btn.innerText = "Processing...";

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            contactNo: phone,
            passportNo: pass,
            university: uni,
            status: "Pending",
            complianceMember: "Unassigned",
            partnerName: document.getElementById('userName').innerText,
            partnerUID: auth.currentUser.uid,
            commissionBDT: selectedUniCommission, // কমিশন অ্যামাউন্ট এখানে সেভ হচ্ছে
            pendingAmount: 0, // শুরুতে ০ থাকবে, কমপ্লায়েন্স আপডেট দিলে বাড়বে
            finalAmount: 0,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });

        // স্লিপ জেনারেশন ও প্রিন্ট
        document.getElementById('slipNameHead').innerText = name;
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        document.getElementById('slipPartner').innerText = document.getElementById('userName').innerText;
        document.getElementById('slipUni').innerText = uni;
        
        const trackURL = `https://scc-partner-portal.web.app/track.html?id=${docRef.id}`;
        document.getElementById('qrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackURL)}`;

        alert("Application Saved! Opening Print Preview...");
        window.print();
        document.getElementById('appModal').style.display = 'none';
        
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; btn.innerText = "Submit & Generate Slip"; }
};

// ৪. ওয়ালেট ব্যালেন্স লিসেনার (রিয়েল-টাইম সামারি)
function initWalletListener(uid) {
    const q = query(collection(db, "applications"), where("partnerUID", "==", uid));
    
    onSnapshot(q, (snap) => {
        let totalPending = 0;
        let totalFinal = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            totalPending += parseFloat(data.pendingAmount || 0);
            totalFinal += parseFloat(data.finalAmount || 0);
        });

        // HTML-এ ভ্যালু আপডেট করা
        if(document.getElementById('pendingWalletBox')) {
            document.getElementById('pendingWalletBox').innerText = `৳ ${Math.round(totalPending).toLocaleString()}`;
        }
        if(document.getElementById('finalWalletBox')) {
            document.getElementById('finalWalletBox').innerText = `৳ ${Math.round(totalFinal).toLocaleString()}`;
            
            // উইথড্র বাটন কন্ট্রোল
            const withdrawBtn = document.getElementById('withdrawBtn');
            if(withdrawBtn) {
                withdrawBtn.disabled = totalFinal <= 0;
                withdrawBtn.style.opacity = totalFinal <= 0 ? "0.5" : "1";
            }
        }
    });
}

// ৫. অ্যাপ্লিকেশান লিস্ট লোড করা
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if(d.partnerUID === auth.currentUser?.uid) { // শুধু নিজের ফাইলগুলো দেখাবে
            html += `<tr><td>${d.studentName}</td><td>${d.contactNo}</td><td>${d.passportNo}</td>
                    <td><span style="color:var(--gold)">${d.status}</span></td><td>${d.complianceMember}</td><td>${d.dateTime}</td></tr>`;
        }
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
});

document.getElementById('logoutBtn').onclick = () => signOut(auth);