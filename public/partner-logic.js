import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- Tracking & Wallet ---
function initTracking() {
    if(!userEmail) return;
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
                <td>${d.complianceStaff || 'Pending'}</td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="background:var(--gold); color:black; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:10px;">View File</a></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...'}</td>
            </tr>`;
        });
        updateWallet(pending, final);
    });
}

function updateWallet(pending, final) {
    document.getElementById('topPending').innerText = `৳ ${pending.toLocaleString()}`;
    document.getElementById('topFinal').innerText = `৳ ${final.toLocaleString()}`;
    document.getElementById('withdrawDisplay').innerText = `৳ ${final.toLocaleString()}`;

    const btn = document.getElementById('withdrawBtn');
    if(final > 0) {
        btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
    }
}

// --- Assessment ---
onSnapshot(collection(db, "universities"), (snap) => {
    const list = snap.docs.map(d => d.data());
    const tbody = document.getElementById('uniList');
    tbody.innerHTML = list.map(u => {
        const comm = (u.semesterFee * u.partnerComm / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
            <td>Gap: ${u.studyGap}y | Intake: ${u.intake}</td>
            <td>$${u.semesterFee}</td>
            <td>৳ ${comm.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${comm})">Apply</button></td>
        </tr>`;
    }).join('');
});

window.openApply = (name, comm) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, comm };
};

// --- Submission & Slip ---
document.getElementById('submitAppBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    if(!name || !pass) return alert("Fill Name/Passport");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, passportNo: pass, partnerEmail: userEmail,
            university: window.currentApp.name, commission: window.currentApp.comm,
            status: 'pending', createdAt: serverTimestamp()
        });

        document.getElementById('slipName').innerText = name;
        document.getElementById('slipUni').innerText = window.currentApp.name;
        new QRCode(document.getElementById("qrcode"), { text: pass, width: 100, height: 100 });
        
        document.getElementById('printArea').style.display = 'block';
        setTimeout(() => { window.print(); location.reload(); }, 1000);
    } catch (e) { alert("Fail"); }
};

// --- Profile ---
document.getElementById('pName').innerText = partnerName;
document.getElementById('pEmail').innerText = userEmail;
document.getElementById('pAgency').innerText = localStorage.getItem('agencyName') || 'Partner Agency';

initTracking();
