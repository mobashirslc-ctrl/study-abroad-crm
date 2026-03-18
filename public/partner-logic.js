import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- ১. ট্র্যাকিং ডেটা ফিক্স (Real-time tracking without ordering error) ---
function initTracking() {
    if(!userEmail) return;
    
    // orderBy ব্যবহার করলে অনেক সময় Firebase Indexing Error দেয়, তাই প্রথমে সাধারণ Query দিয়ে চেক করছি।
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = ""; 
        let pendingBal = 0, finalBal = 0;

        if (snap.empty) {
            tbody.innerHTML = "<tr><td colspan='6' align='center'>No data available.</td></tr>";
        }

        snap.forEach(doc => {
            const d = doc.data();
            const comm = Number(d.commission) || 0;
            if(d.status === 'pending') pendingBal += comm;
            if(d.status === 'approved') finalBal += comm;

            const date = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...';

            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold)">View PDF</a></td>
                <td>${date}</td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳ ${pendingBal.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${finalBal.toLocaleString()}`;
    });
}

// --- ২. অ্যাসেসমেন্ট এবং সার্চ বক্স ফিক্স ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUniTable(allUnis);
});

function renderUniTable(data) {
    const tbody = document.getElementById('uniList');
    tbody.innerHTML = data.map(u => {
        const commBDT = (parseFloat(u.semesterFee) * parseFloat(u.partnerComm) / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
            <td>Gap: ${u.studyGap}y | Intake: ${u.intake}</td>
            <td>Fee: $${u.semesterFee}<br>Living: $${u.livingCost}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${commBDT})">Apply</button></td>
        </tr>`;
    }).join('');
}

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const langType = document.getElementById('fLangType').value;
    const filtered = allUnis.filter(u => {
        return (country === "" || u.country.toLowerCase().includes(country)) &&
               (degree === "" || u.degree === degree);
    });
    renderUniTable(filtered);
};

document.getElementById('refreshBtn').onclick = () => location.reload();

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, commission };
};

// --- ৩. ফাইল সাবমিট এবং স্লিপ জেনারেশন ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    
    if(!sName || !sPass) return alert("Please fill Name and Passport!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Submitting...";
    btn.disabled = true;

    try {
        // Cloudinary upload placeholders (Simplified for this version)
        const urls = { academic: "", passport: "", others: "" };
        
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            contactNo: document.getElementById('sContact').value,
            studyGap: document.getElementById('sGap').value,
            university: window.currentApp.name,
            commission: window.currentApp.commission,
            partnerEmail: userEmail,
            partnerName: partnerName,
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        });

        // Show Slip
        document.getElementById('slipNameDisp').innerText = sName.toUpperCase();
        document.getElementById('slipPassDisp').innerText = sPass;
        document.getElementById('slipUniDisp').innerText = window.currentApp.name;

        const qrArea = document.getElementById("qrcode");
        qrArea.innerHTML = "";
        new QRCode(qrArea, { text: `https://georun.com/track?id=${sPass}`, width: 100, height: 100 });

        document.getElementById('printArea').style.display = 'block';
        setTimeout(() => { window.print(); location.reload(); }, 1200);

    } catch (e) {
        console.error(e);
        alert("Submit Failed! Try again.");
        btn.disabled = false;
        btn.innerText = "Confirm & Submit";
    }
};

// Start
initTracking();
