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

// --- 1. Tracking Data Fix ---
function initTracking() {
    if(!userEmail) return;
    // Query order must match your index or remove orderBy to test first
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = "";
        let pending = 0, final = 0;

        snap.forEach(doc => {
            const d = doc.data();
            const comm = Number(d.commission) || 0;
            if(d.status === 'pending') pending += comm;
            if(d.status === 'approved') final += comm;

            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td><a href="${d.docs?.pdfAcademic || '#'}" target="_blank" style="color:var(--gold)">View</a></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...'}</td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${final.toLocaleString()}`;
    });
}

// --- 2. Assessment & Slip Fix ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
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
            <td>৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${commBDT})">Apply</button></td>
        </tr>`;
    }).join('');
}

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, commission };
};

document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    if(!sName || !sPass) return alert("Required fields missing!");

    document.getElementById('submitAppBtn').innerText = "Submitting...";
    
    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName, passportNo: sPass, 
            university: window.currentApp.name, commission: window.currentApp.commission,
            partnerEmail: userEmail, partnerName: partnerName,
            status: 'pending', createdAt: serverTimestamp()
        });
        
        // Success Slip
        document.getElementById('slipNameDisplay').innerText = sName.toUpperCase();
        document.getElementById('slipPassDisplay').innerText = sPass;
        document.getElementById('slipUniDisplay').innerText = window.currentApp.name;
        
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://study-abroad-crm-nine.vercel.app/track.html?id=${sPass}`,
            width: 100, height: 100
        });

        document.getElementById('printArea').style.display = 'block';
        setTimeout(() => { window.print(); location.reload(); }, 1000);

    } catch (e) { alert("Error!"); }
};

// --- 3. Profile Setup ---
document.getElementById('pName').innerText = partnerName;
document.getElementById('pEmail').innerText = userEmail;
document.getElementById('pAgency').innerText = localStorage.getItem('agencyName') || 'Authorized Partner';

initTracking();
