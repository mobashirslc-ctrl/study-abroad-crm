import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const BDT_RATE = 120;
const partnerName = localStorage.getItem('partnerName') || "Partner";
document.getElementById('partnerDisplayName').innerText = partnerName;

// --- 1. SMART SEARCH LOGIC (Admin Data Sync) ---
function initSmartSearch() {
    onSnapshot(collection(db, "universities"), (snap) => {
        const unis = [];
        snap.forEach(doc => unis.push({ id: doc.id, ...doc.data() }));

        const filter = () => {
            const nameVal = document.getElementById('fName').value.toLowerCase();
            const countryVal = document.getElementById('fCountry').value.toLowerCase();
            const degreeVal = document.getElementById('fDegree').value;
            const maxFee = parseFloat(document.getElementById('fMaxFee').value) || Infinity;

            const filtered = unis.filter(u => {
                return (u.universityName.toLowerCase().includes(nameVal)) &&
                       (u.country.toLowerCase().includes(countryVal)) &&
                       (degreeVal === "" || u.degree === degreeVal) &&
                       (Number(u.semesterFee) <= maxFee);
            });

            renderUniTable(filtered);
        };

        ['fName', 'fCountry', 'fDegree', 'fMaxFee'].forEach(id => {
            document.getElementById(id).addEventListener('input', filter);
        });

        filter(); // Initial Load
    });
}

function renderUniTable(data) {
    const tbody = document.getElementById('assessmentResults');
    tbody.innerHTML = data.map(u => {
        const comm = ((u.semesterFee * u.partnerComm) / 100) * BDT_RATE;
        return `
        <tr>
            <td><b>${u.universityName}</b><br><small>${u.courseName}</small></td>
            <td>${u.country}<br><small>Rank: #${u.rank}</small></td>
            <td><span class="badge">${u.degree}</span><br><small>${u.ieltsReq || u.uIeltsO || 'N/A'}</small></td>
            <td>$${Number(u.semesterFee).toLocaleString()}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${comm.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="alert('Applying for ${u.universityName}')">Apply</button></td>
        </tr>`;
    }).join('');
    document.getElementById('matchCount').innerText = `${data.length} Results`;
}

// --- 2. FILE TRACKING LOGIC (All Files) ---
function initTracking() {
    // query orderBy createdAt to show newest first
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingBody');
        let html = "";
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt?.toDate() ? d.createdAt.toDate().toLocaleDateString() : 'Pending';
            html += `
            <tr>
                <td><b>${d.studentName}</b><br><small>${d.passportNo || ''}</small></td>
                <td>${d.university}</td>
                <td><small>${d.partnerName || 'Unknown'}</small></td>
                <td><span class="badge" style="color:var(--gold); border:1px solid var(--gold);">${d.status.toUpperCase()}</span></td>
                <td>${date}</td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">No files found.</td></tr>';
    });
}

// Start
initSmartSearch();
initTracking();
