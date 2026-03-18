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

const BDT_RATE = 120; // 1 USD = 120 BDT
const partnerName = localStorage.getItem('partnerName') || "Partner";
document.getElementById('partnerDisplayName').innerText = partnerName;

// --- REAL-TIME SMART SEARCH LOGIC ---
function initSmartSearch() {
    const uniRef = collection(db, "universities");
    
    // Admin থেকে ডাটা আসার সাথে সাথে এই ফাংশনটি ট্রিগার হবে
    onSnapshot(uniRef, (snap) => {
        const allUniversities = [];
        snap.forEach(doc => allUniversities.push({ id: doc.id, ...doc.data() }));

        const filterData = () => {
            const countryVal = document.getElementById('fCountry').value.toLowerCase();
            const degreeVal = document.getElementById('fDegree').value;
            const ieltsVal = document.getElementById('fIelts').value.toLowerCase();
            const gpaVal = parseFloat(document.getElementById('fGPA').value) || 0;

            const filtered = allUniversities.filter(u => {
                // Admin fields matching: country, degree, ieltsReq, minGPA
                const matchCountry = (u.country || "").toLowerCase().includes(countryVal);
                const matchDegree = degreeVal === "" || u.degree === degreeVal;
                const matchIelts = (u.ieltsReq || "").toLowerCase().includes(ieltsVal);
                const matchGPA = (parseFloat(u.minGPA) || 0) >= gpaVal;

                return matchCountry && matchDegree && matchIelts && matchGPA;
            });

            renderTable(filtered);
            document.getElementById('matchCount').innerText = `${filtered.length} Universities Found`;
        };

        // সার্চ বক্সের ইনপুটে লিসেনার যোগ করা (Auto-suggest)
        ['fCountry', 'fDegree', 'fIelts', 'fGPA'].forEach(id => {
            document.getElementById(id).addEventListener('input', filterData);
            document.getElementById(id).addEventListener('change', filterData);
        });

        filterData(); // পেজ লোড হলে ডাটা দেখাবে
    });
}

function renderTable(data) {
    const tbody = document.getElementById('assessmentResults');
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5;">No matching data found.</td></tr>';
        return;
    }

    data.forEach(u => {
        // কমিশন ক্যালকুলেশন (Fee * Comm % * Rate)
        const commAmt = ((u.semesterFee * u.partnerComm) / 100) * BDT_RATE;
        
        tbody.innerHTML += `
        <tr>
            <td>
                <b style="color:var(--gold);">${u.universityName}</b><br>
                <small style="opacity:0.6;">${u.courseName || 'N/A'}</small>
            </td>
            <td>${u.country}<br><small>Rank: #${u.rank}</small></td>
            <td>
                <span class="badge">${u.degree}</span><br>
                <small>${u.ieltsReq}</small>
            </td>
            <td>$${Number(u.semesterFee).toLocaleString()}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${commAmt.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="alert('Applying for ${u.universityName}')">Apply</button></td>
        </tr>`;
    });
}

// ইনশিয়ালাইজ
initSmartSearch();
