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

// ১. ইউনিভার্সিটি সার্চ
window.runSearch = async () => {
    const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching...</td></tr>';

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
                    <td><button class="btn-gold" onclick="openApp('${u.universityName}', ${commCalculated})">OPEN FILE</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No match found.</td></tr>';
    } catch (e) { console.error(e); }
};

// ২. ওয়ালেট আপডেট (Logic Fix: compliance controlled)
onSnapshot(collection(db, "applications"), (snap) => {
    let pending = 0;
    let available = 0;
    snap.forEach(doc => {
        const d = doc.data();
        pending += parseFloat(d.pendingAmount || 0);
        available += parseFloat(d.finalAmount || 0);
    });
    document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
});

// ৩. ফাইল সাবমিট (Initial Wallet will be 0)
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    if (!sName || !sPass) return alert("Fill all data!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: document.getElementById('mTitle').innerText,
            commissionBDT: currentComm,
            pendingAmount: 0, // Submission এ ব্যালেন্স ০ থাকবে
            finalAmount: 0,   // Submission এ ব্যালেন্স ০ থাকবে
            status: "PENDING",
            timestamp: serverTimestamp()
        });
        
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipPass').innerText = sPass;
        document.getElementById('slipUni').innerText = document.getElementById('mTitle').innerText;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
        
        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
    } catch (e) { alert(e.message); }
};

// ৪. লাইভ ট্র্যাকিং
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
        html += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b>${d.status}</b></td><td>${date}</td></tr>`;
    });
    const trackBody = document.getElementById('liveTrackingBody') || document.querySelector('.sharedBody');
    if (trackBody) trackBody.innerHTML = html;
});