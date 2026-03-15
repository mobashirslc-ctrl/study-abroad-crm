import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// --- স্টেবিলিটি এবং অথেনটিকেশন চেক ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // লগইন না থাকলে সরাসরি মেইন পেজে পাঠিয়ে দাও
        window.location.replace("index.html");
    } else {
        // লগইন থাকলে লোডার সরিয়ে মেইন পেজ দেখাও
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        startDashboard(user); 
    }
});

function startDashboard(currentUser) {
    let currentComm = 0;

    // ১. ইউনিভার্সিটি সার্চ লজিক
    window.runSearch = async () => {
        const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
        const fDegree = document.getElementById('fDegree').value;
        const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
        const tbody = document.getElementById('uniResultsBody');
        
        document.getElementById('resArea').style.display = 'block';
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching Universities...</td></tr>';

        try {
            const querySnapshot = await getDocs(collection(db, "universities"));
            let rows = "";
            querySnapshot.forEach(doc => {
                const u = doc.data();
                const fee = parseFloat(u.semesterFee) || 0;
                const pComm = parseFloat(u.partnerComm) || 0;
                const minGPA = parseFloat(u.minGPA) || 0;

                if ((!fCountry || u.country.toLowerCase().includes(fCountry)) && (!fDegree || u.degreeType === fDegree) && (fGPA >= minGPA)) {
                    const commCalculated = Math.round((fee * 120 * pComm) / 100);
                    rows += `<tr>
                        <td><b>${u.universityName}</b></td>
                        <td>${u.country}</td>
                        <td>${u.degreeType}</td>
                        <td>${u.courseName}</td>
                        <td>$${fee}</td>
                        <td style="color:#00ff00; font-weight:bold;">৳ ${commCalculated.toLocaleString()}</td>
                        <td>${minGPA}</td>
                        <td>${u.ieltsO || 'N/A'}</td>
                        <td>${u.scholarship || '0%'}</td>
                        <td>${u.intake || 'N/A'}</td>
                        <td><button class="btn-gold" style="padding: 5px 10px;" onclick="openApp('${u.universityName}', ${commCalculated})">OPEN FILE</button></td>
                    </tr>`;
                }
            });
            tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No match found.</td></tr>';
        } catch (e) { console.error("Search Error:", e); }
    };
    document.getElementById('runSearchBtn').onclick = window.runSearch;

    // ২. ওয়ালেট এবং অ্যাপ্লিকেশন ট্র্যাকিং (রিয়েল-টাইম)
    // শুধুমাত্র বর্তমান ইউজারের অ্যাপ্লিকেশনগুলো ফিল্টার করে আনা হচ্ছে
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email));
    
    onSnapshot(qApp, (snap) => {
        let pending = 0;
        let available = 0;
        let trackingRows = "";
        
        snap.forEach(doc => {
            const d = doc.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            
            const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
            trackingRows += `<tr>
                <td>${d.studentName}</td>
                <td>${d.passport}</td>
                <td>${d.university}</td>
                <td><b style="color:#ffcc00">${d.status}</b></td>
                <td>${date}</td>
            </tr>`;
        });
        
        document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        // ওয়ালেট সেকশনের ব্যালেন্সও আপডেট করো
        if(document.getElementById('walletBalance')) {
            document.getElementById('walletBalance').innerText = `৳ ${available.toLocaleString()}`;
        }
        document.getElementById('liveTrackingBody').innerHTML = trackingRows;
    });

    // ৩. ফাইল সাবমিট লজিক
    window.openApp = (uni, comm) => {
        document.getElementById('mTitle').innerText = uni;
        currentComm = comm;
        document.getElementById('appModal').style.display = 'flex';
    };

    document.getElementById('submitBtn').onclick = async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        if (!sName || !sPass) return alert("Please fill all student details!");

        try {
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passport: sPass,
                university: document.getElementById('mTitle').innerText,
                commissionBDT: currentComm,
                pendingAmount: 0,
                finalAmount: 0,
                status: "PENDING",
                partnerEmail: currentUser.email, // পার্টনার ট্র্যাক করার জন্য
                timestamp: serverTimestamp()
            });
            
            document.getElementById('slipName').innerText = sName;
            document.getElementById('slipPass').innerText = sPass;
            document.getElementById('slipUni').innerText = document.getElementById('mTitle').innerText;
            document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
            
            document.getElementById('appModal').style.display = 'none';
            document.getElementById('slipOverlay').style.display = 'flex';
        } catch (e) { alert("Submission failed: " + e.message); }
    };

    // ৪. উইথড্রয়াল রিকোয়েস্ট লজিক
    if(document.getElementById('requestWithdrawBtn')) {
        document.getElementById('requestWithdrawBtn').onclick = async () => {
            const amount = parseFloat(document.getElementById('wAmount').value);
            const method = document.getElementById('wMethod').value;
            const details = document.getElementById('wDetails').value;
            const currentBalance = parseFloat(document.getElementById('availAm').innerText.replace('৳ ', '').replace(',', '')) || 0;

            if(!amount || !details) return alert("Please fill all details!");
            if(amount < 5000) return alert("Minimum withdrawal is ৳ 5,000");
            if(amount > currentBalance) return alert("Insufficient balance!");

            try {
                await addDoc(collection(db, "withdrawals"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    amount: amount,
                    method: method,
                    details: details,
                    status: "PENDING",
                    timestamp: serverTimestamp()
                });
                alert("Withdrawal request sent! Wait for admin approval.");
                document.getElementById('wAmount').value = "";
                document.getElementById('wDetails').value = "";
            } catch (e) { alert("Error: " + e.message); }
        };

        // উইথড্রয়াল হিস্ট্রি ট্র্যাকিং
        const qWithdraw = query(collection(db, "withdrawals"), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
        onSnapshot(qWithdraw, (snap) => {
            let historyHtml = "";
            snap.forEach(doc => {
                const w = doc.data();
                const date = w.timestamp ? new Date(w.timestamp.seconds * 1000).toLocaleDateString() : 'New';
                let statusColor = w.status === 'APPROVED' ? '#00ff00' : (w.status === 'REJECTED' ? '#ff5e5e' : '#ffcc00');
                
                historyHtml += `<tr>
                    <td>${date}</td>
                    <td>৳ ${w.amount.toLocaleString()}</td>
                    <td>${w.method.toUpperCase()}</td>
                    <td style="color:${statusColor}; font-weight:bold;">${w.status}</td>
                </tr>`;
            });
            document.getElementById('withdrawHistoryBody').innerHTML = historyHtml || '<tr><td colspan="4" style="text-align:center;">No history found.</td></tr>';
        });
    }

    // ৫. লগআউট (সেশন ক্লিয়ার করে সরাসরি index.html এ যাবে)
    document.getElementById('logoutBtn').onclick = () => {
        if(confirm("Are you sure you want to logout?")) {
            signOut(auth).then(() => {
                window.location.replace("index.html");
            });
        }
    };
}