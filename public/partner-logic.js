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

let selectedComm = 0;

// 1. Search Logic
window.runSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const userGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    
    document.getElementById('resArea').style.display = 'block';
    const tbody = document.getElementById('uniResultsBody');
    tbody.innerHTML = '<tr><td colspan="10">Searching...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            const comm = Math.round((parseFloat(u.semesterFee || 0) * 120 * parseFloat(u.partnerComm || 0)) / 100);
            
            if ((!country || (u.country || "").toLowerCase().includes(country)) && 
                (!degree || u.degree === degree) && 
                (userGPA >= (parseFloat(u.minGPA) || 0))) {
                
                rows += `<tr>
                    <td>${u.universityName}</td><td>${u.country}</td><td>${u.degree}</td>
                    <td>${u.courseName}</td><td>$${u.semesterFee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${comm.toLocaleString()}</td>
                    <td>${u.minGPA}</td><td>${u.ieltsO}</td><td>${u.intake}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.universityName}', ${comm})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10">No University Found.</td></tr>';
    });
};

// 2. Open Modal
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    selectedComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

// 3. Submit Application & Generate Slip
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;

    if (!name || !pass) return alert("Fill all fields!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, passport: pass, university: uni, 
            commission: selectedComm, status: "Pending", 
            timestamp: serverTimestamp()
        });

        // Setup Slip
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        // QR Code
        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-track.web.app/?id=${pass}`,
            width: 120, height: 120
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
    } catch (e) { alert("Error!"); }
};

// 4. Live Tracking
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Pending'}</td></tr>`;
    });
    document.getElementById('liveTrackingBody').innerHTML = r;
});