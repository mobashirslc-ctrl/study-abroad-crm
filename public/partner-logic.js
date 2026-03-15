import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
            document.getElementById('profileName').innerText = userDoc.data().fullName;
        } else {
            await signOut(auth);
            window.location.replace("index.html");
        }
    } else {
        if (!window.location.pathname.includes("index.html")) window.location.replace("index.html");
    }
});

// ২. স্মার্ট অ্যাসেসমেন্ট (আপডেটেড কারেন্সি কনভারশন লজিক)
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const resultsArea = document.getElementById('assessmentResults');
    const tbody = document.getElementById('uniResultsBody');
    
    resultsArea.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='12' style='text-align:center;'>Searching...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        
        // কারেন্সি রেট কনফিগারেশন
        const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };

        snap.forEach(doc => {
            const u = doc.data();
            
            // --- কমিশন ক্যালকুলেশন লজিক শুরু ---
            const currentRate = rates[u.currency] || 120; // কারেন্সি না থাকলে ১২০ ডিফল্ট
            const semesterFeeRaw = parseFloat(u.semesterFee) || 0;
            const commPercent = parseFloat(u.partnerCommPercent) || 0;

            // ১. আগে টাকায় কনভার্ট করা
            const feeInBDT = semesterFeeRaw * currentRate;
            // ২. তারপর বিডিটি অ্যামাউন্টের ওপর কমিশন বের করা
            const commissionAmountBDT = (feeInBDT * commPercent) / 100;
            // --- কমিশন ক্যালকুলেশন লজিক শেষ ---

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
                        <button class="btn-gold" style="padding:6px 12px; font-size:10px;" onclick="openApp('${u.name}')">Open File</button>
                    </td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || "<tr><td colspan='12'>No Matching Data</td></tr>";
    });
};

window.openApp = (uniName) => {
    document.getElementById('mTitle').innerText = uniName;
    document.getElementById('appModal').style.display = 'flex';
};

// ৩. সাবমিশন এবং স্লিপ জেনারেশন
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
            studentName: name, contactNo: phone, passportNo: pass,
            university: uni, status: "Pending", complianceMember: "Unassigned",
            partnerName: document.getElementById('userName').innerText,
            partnerUID: auth.currentUser.uid,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });

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

onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        html += `<tr><td>${d.studentName}</td><td>${d.contactNo}</td><td>${d.passportNo}</td>
                <td><span style="color:var(--gold)">${d.status}</span></td><td>${d.complianceMember}</td><td>${d.dateTime}</td></tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
});

document.getElementById('logoutBtn').onclick = () => signOut(auth);