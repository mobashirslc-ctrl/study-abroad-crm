import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentComm = 0;

// ১. ইউনিভার্সিটি সার্চ লজিক
window.runSearch = async () => {
    const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;

    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching SCC Database...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "universities"));
        let rows = "";

        querySnapshot.forEach(doc => {
            const u = doc.data();
            const uniName = u.universityName || "N/A";
            const country = u.country || "N/A";
            const fee = parseFloat(u.semesterFee) || 0;
            const pComm = parseFloat(u.partnerComm) || 0;
            const minGPA = parseFloat(u.minGPA) || 0;

            if ((!fCountry || country.toLowerCase().includes(fCountry)) && 
                (!fDegree || u.degreeType === fDegree) && 
                (fGPA >= minGPA)) {
                
                const commCalculated = Math.round((fee * 120 * pComm) / 100);
                
                rows += `<tr>
                    <td><b>${uniName}</b></td>
                    <td>${country}</td>
                    <td>${u.degreeType || 'N/A'}</td>
                    <td>${u.courseName || 'N/A'}</td>
                    <td>$${fee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${commCalculated.toLocaleString()}</td>
                    <td>${minGPA}</td>
                    <td>${u.ieltsO || 'N/A'}</td>
                    <td>${u.scholarship || '0%'}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${uniName}', ${commCalculated})">OPEN FILE</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No match found.</td></tr>';
    } catch (e) {
        console.error("Error fetching data:", e);
    }
};

// ২. ওয়ালেট আপডেট (রিয়েল টাইম)
onSnapshot(collection(db, "applications"), (snap) => {
    let pending = 0;
    let available = 0;
    snap.forEach(doc => {
        const d = doc.data();
        const amt = parseFloat(d.commission || 0);
        const status = (d.status || "").toLowerCase();
        if (status === "approved" || status === "success") available += amt;
        else pending += amt;
    });
    document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
});

// ৩. অ্যাপ্লিকেশন হ্যান্ডলিং ও মডাল ওপেন
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

// ৪. সাবমিট লজিক + স্লিপ জেনারেশন (FIXED)
document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const uniName = document.getElementById('mTitle').innerText;

    if (!sName || !sPass) return alert("Student Name and Passport are required!");

    try {
        // Firebase-এ ডাটা সেভ
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: uniName,
            commission: currentComm,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // স্লিপের ডাটা আপডেট
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipPass').innerText = sPass;
        document.getElementById('slipUni').innerText = uniName;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        // QR Code জেনারেট (যদি index.html-এ qrcode.js থাকে)
        const qrBox = document.getElementById('qrcode');
        if (qrBox) {
            qrBox.innerHTML = "";
            new QRCode(qrBox, { text: sPass, width: 100, height: 100 });
        }

        // মডাল বন্ধ করে স্লিপ দেখানো
        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (e) {
        alert("Error: " + e.message);
    }
};

// ৫. লাইভ ফাইল ট্র্যাকিং (FIXED)
const q = query(collection(db, "applications"), orderBy("timestamp", "desc"));
onSnapshot(q, (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
        
        let sColor = "#f1c40f"; // Gold for Pending
        if (d.status === "Approved" || d.status === "Success") sColor = "#2ecc71"; // Green
        if (d.status === "Rejected") sColor = "#ff4757"; // Red

        html += `<tr>
            <td>${d.studentName}</td>
            <td>${d.passport}</td>
            <td>${d.university}</td>
            <td><b style="color:${sColor}">${d.status || 'Pending'}</b></td>
            <td>${date}</td>
        </tr>`;
    });
    
    // টেবিলে ডাটা পুশ করা (ID match নিশ্চিত করুন)
    const trackBody = document.getElementById('liveTrackingBody') || document.querySelector('.sharedBody');
    if (trackBody) trackBody.innerHTML = html;
});