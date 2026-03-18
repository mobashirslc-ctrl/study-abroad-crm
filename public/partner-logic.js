import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const userEmail = localStorage.getItem('userEmail');
const partnerName = localStorage.getItem('partnerName') || 'Partner';
document.getElementById('partnerNameDisplay').innerText = partnerName;

let allUnis = [];

// --- ১. অ্যাসেসমেন্ট লজিক (Search & Refresh) ---
function initAssessment() {
    onSnapshot(collection(db, "universities"), (snap) => {
        allUnis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUniTable(allUnis); // প্রাথমিক লোড
    });

    // Search button trigger
    document.getElementById('searchBtn').onclick = () => {
        const country = document.getElementById('fCountry').value.toLowerCase();
        const degree = document.getElementById('fDegree').value;
        const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
        const langScore = parseFloat(document.getElementById('fLang').value) || 0;

        const filtered = allUnis.filter(u => {
            const mCountry = country === "" || u.country.toLowerCase().includes(country);
            const mDegree = degree === "" || u.degree === degree;
            const mGPA = gpa >= (parseFloat(u.minGPA) || 0);
            const mLang = langScore >= (parseFloat(u.ieltsReq) || 0);
            return mCountry && mDegree && mGPA && mLang;
        });
        renderUniTable(filtered);
    };

    // Refresh button trigger
    document.getElementById('refreshBtn').onclick = () => {
        document.querySelectorAll('.filter-grid input, .filter-grid select').forEach(el => el.value = "");
        renderUniTable(allUnis);
    };
}

function renderUniTable(data) {
    const tbody = document.getElementById('uniList');
    document.getElementById('matchCount').innerText = `${data.length} found`;
    tbody.innerHTML = data.map(u => {
        const commBDT = (parseFloat(u.semesterFee) * parseFloat(u.partnerComm) / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b></td>
            <td>GPA: ${u.minGPA} | Req: ${u.ieltsReq}</td>
            <td>$${u.semesterFee}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${commBDT})">Apply</button></td>
        </tr>`;
    }).join('');
}

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, commission };
};

// --- ২. সাবমিশন লজিক ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const sContact = document.getElementById('sContact').value;
    if(!sName || !sPass) return alert("Missing student details!");

    document.getElementById('submitAppBtn').innerText = "Uploading...";
    
    // Simple Cloudinary Logic (Previous logic integration)
    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            contactNo: sContact,
            passportNo: sPass,
            university: window.currentApp.name,
            commission: window.currentApp.commission,
            partnerEmail: userEmail,
            partnerName: partnerName,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        alert("Success!");
        location.reload();
    } catch (e) { alert("Error!"); }
};

// --- ৩. ট্র্যাকিং ও ওয়ালেট লজিক ---
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        let current = 0, success = 0, reject = 0, totalEarn = 0, pendingEarn = 0, finalEarn = 0;
        
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            if(d.status === 'pending') { current++; pendingEarn += d.commission; }
            else if(d.status === 'approved') { success++; finalEarn += d.commission; totalEarn += d.commission; }
            else if(d.status === 'rejected') { reject++; }

            tbody.innerHTML += `<tr>
                <td>${d.studentName}</td>
                <td>${d.contactNo || 'N/A'}</td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td>View</td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : ''}</td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳ ${pendingEarn.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${finalEarn.toLocaleString()}`;
        document.getElementById('statCurrent').innerText = current;
        document.getElementById('statSuccess').innerText = success;
        document.getElementById('statEarn').innerText = `৳ ${totalEarn.toLocaleString()}`;
        document.getElementById('statReject').innerText = reject;
    });
}

initAssessment();
initTracking();
