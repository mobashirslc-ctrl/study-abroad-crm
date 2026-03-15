import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Search Logic with Country Field
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value;
    const fUserGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fUserIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Searching...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            const dbCountry = (u.country || "").toLowerCase();
            const dbDegree = u.degree || u.degreeType || "";
            const dbGPA = parseFloat(u.minGPA || 0);
            const dbIELTS = parseFloat(u.ieltsO || u.ieltsOverall || 0);

            if ((!fCountry || dbCountry.includes(fCountry)) && 
                (!fDegree || dbDegree === fDegree) && 
                (fUserGPA >= dbGPA) && (fUserIELTS >= dbIELTS)) {
                
                const comm = Math.round((parseFloat(u.semesterFee || 0) * 120 * parseFloat(u.partnerComm || 0)) / 100);
                
                rows += `<tr>
                    <td>${u.universityName}</td><td>${u.country}</td><td>${dbDegree}</td><td>${u.courseName}</td>
                    <td>$${u.semesterFee}</td><td style="color:#2ecc71">৳ ${comm.toLocaleString()}</td>
                    <td>${dbGPA}</td><td>${dbIELTS}</td><td>${u.intake}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.universityName}', ${comm})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10" style="text-align:center;">No match found.</td></tr>';
    });
};

// Modal Trigger
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

// Submit Application Logic
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;

    if (!name || !pass) return alert("Please fill all fields!");

    document.getElementById('submitBtn').innerText = "Submitting...";
    document.getElementById('submitBtn').disabled = true;

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name,
            passport: pass,
            university: uni,
            commission: currentComm,
            status: "Pending",
            date: serverTimestamp()
        });

        // Generate QR and Slip
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = uni;
        
        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-partner-portal.web.app/track?pass=${pass}`,
            width: 128,
            height: 128
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (e) {
        alert("Error: " + e.message);
    }
};