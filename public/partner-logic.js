import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. Wallet & Stats Logic (Based on Status)
onSnapshot(collection(db, "applications"), (snap) => {
    let pending = 0;
    let available = 0;
    snap.forEach(doc => {
        const d = doc.data();
        const comm = parseFloat(d.commission || 0);
        if (d.status === "Pending") pending += comm;
        if (d.status === "Approved" || d.status === "Success") available += comm;
    });
    document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
});

// 2. Assessment Search (Fix: Admin Field Mapping)
window.runSearch = () => {
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    document.getElementById('resArea').style.display = 'block';
    const tbody = document.getElementById('uniResultsBody');
    tbody.innerHTML = '<tr><td colspan="10">Searching Database...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            
            // Mapping fields based on admin inputs
            const dbCountry = (u.country || "").toLowerCase();
            const dbDegree = u.degree || "";
            const minGPA = parseFloat(u.minGPA || 0);
            const minIELTS = parseFloat(u.ieltsO || u.ieltsOverall || 0);

            if ((!fCountry || dbCountry.includes(fCountry)) && 
                (!fDegree || dbDegree === fDegree) && 
                (fGPA >= minGPA) && (fIELTS >= minIELTS)) {
                
                const comm = Math.round((parseFloat(u.semesterFee || 0) * 120 * parseFloat(u.partnerComm || 0)) / 100);
                
                rows += `<tr>
                    <td><b>${u.universityName}</b></td><td>${u.country}</td><td>${u.degree}</td>
                    <td>${u.courseName}</td><td>$${u.semesterFee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${comm.toLocaleString()}</td>
                    <td>${u.minGPA}</td><td>${minIELTS}</td><td>${u.intake}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.universityName}', ${comm})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10">No Universities match your data.</td></tr>';
    });
};

window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

// 3. Application Submission & Slip QR
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;

    if (!name || !pass) return alert("Student data missing!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, passport: pass, university: uni,
            commission: currentComm, status: "Pending",
            timestamp: serverTimestamp()
        });

        // Show Slip
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-track.web.app/status?pass=${pass}`,
            width: 120, height: 120
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
    } catch (e) { alert("Error!"); }
};

// 4. Real-time Recent List
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Processing';
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${date}</td></tr>`;
    });
    document.getElementById('liveTrackingBody').innerHTML = r;
});