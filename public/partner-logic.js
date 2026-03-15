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

let activeComm = 0;

// Search Logic with Country Field Added
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Searching...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            const dbCountry = (u.country || "").toLowerCase();
            const dbDegree = u.degree || u.degreeType || "";
            const minGPA = parseFloat(u.minGPA || 0);
            const minIELTS = parseFloat(u.ieltsO || u.ieltsOverall || 0);

            if ((!fCountry || dbCountry.includes(fCountry)) && 
                (!fDegree || dbDegree === fDegree) && 
                (fGPA >= minGPA) && (fIELTS >= minIELTS)) {
                
                const comm = Math.round((parseFloat(u.semesterFee || 0) * 120 * parseFloat(u.partnerComm || 0)) / 100);
                
                rows += `<tr>
                    <td><b>${u.universityName}</b></td>
                    <td>${u.country}</td>
                    <td>${dbDegree}</td>
                    <td>${u.courseName}</td>
                    <td>$${u.semesterFee}</td>
                    <td style="color:#2ecc71; font-weight:bold;">৳ ${comm.toLocaleString()}</td>
                    <td>${minGPA}</td>
                    <td>${minIELTS}</td>
                    <td>${u.intake}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.universityName}', ${comm})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10" style="text-align:center;">No matching university found.</td></tr>';
    });
};

window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    activeComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

// Application Submission & QR Generation
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const uni = document.getElementById('mTitle').innerText;

    if (!name || !pass) return alert("Please enter Student Name and Passport!");

    document.getElementById('submitBtn').innerText = "Processing...";
    document.getElementById('submitBtn').disabled = true;

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name,
            passport: pass,
            university: uni,
            commission: activeComm,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // Fill Slip Data
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = uni;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        // Generate QR Code
        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-track.web.app/?id=${pass}`,
            width: 150,
            height: 150
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (err) {
        alert("Submission Failed!");
        console.error(err);
    }
};