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

let allUnis = [];

// --- 1. Assessment Logic ---
function initAssessment() {
    onSnapshot(collection(db, "universities"), (snap) => {
        allUnis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUniTable(allUnis);
    });

    document.getElementById('searchBtn').onclick = () => {
        const country = document.getElementById('fCountry').value.toLowerCase();
        const degree = document.getElementById('fDegree').value;
        const filtered = allUnis.filter(u => {
            return (country === "" || u.country.toLowerCase().includes(country)) &&
                   (degree === "" || u.degree === degree);
        });
        renderUniTable(filtered);
    };

    document.getElementById('refreshBtn').onclick = () => location.reload();
}

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

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, commission };
};

// --- 2. Application Submission & Slip ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const sContact = document.getElementById('sContact').value;
    const sGap = document.getElementById('sGap').value;

    if(!sName || !sPass) return alert("Student Name & Passport required!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Submitting...";
    btn.disabled = true;

    try {
        const fileIds = ['pdfAcademic', 'pdfPassport', 'pdfLanguage', 'pdfOthers'];
        let urls = {};
        for(let id of fileIds) {
            const file = document.getElementById(id).files[0];
            if(file) {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("upload_preset", "ihp_upload");
                const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: fd });
                const d = await res.json();
                urls[id] = d.secure_url;
            }
        }

        await addDoc(collection(db, "applications"), {
            studentName: sName, passportNo: sPass, contactNo: sContact, studyGap: sGap,
            university: window.currentApp.name, commission: window.currentApp.commission,
            partnerEmail: userEmail, partnerName: partnerName,
            status: 'pending', docs: urls, createdAt: serverTimestamp()
        });

        generateSlip(sName, sPass, window.currentApp.name);
    } catch (e) { alert("Submission Failed!"); btn.disabled = false; }
};

function generateSlip(name, pass, uni) {
    document.getElementById('slipNameDisplay').innerText = name.toUpperCase();
    document.getElementById('slipPassDisplay').innerText = pass;
    document.getElementById('slipUniDisplay').innerText = uni;
    document.getElementById('slipPartnerDisplay').innerText = partnerName;

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: `https://study-abroad-crm-nine.vercel.app/track.html?id=${pass}`,
        width: 120, height: 120
    });

    document.getElementById('printArea').style.display = 'block';
    setTimeout(() => { window.print(); location.reload(); }, 1000);
}

// --- 3. Tracking Fix ---
function initTracking() {
    if(!userEmail) return;
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = "";
        let pendingEarn = 0, finalEarn = 0;

        snap.forEach(doc => {
            const d = doc.data();
            if(d.status === 'pending') pendingEarn += (d.commission || 0);
            if(d.status === 'approved') finalEarn += (d.commission || 0);

            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.contactNo}</td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Pending'}</td>
                <td><a href="${d.docs?.pdfAcademic || '#'}" target="_blank" style="color:var(--gold)">View</a></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : 'Just now'}</td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳ ${pendingEarn.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${finalEarn.toLocaleString()}`;
    });
}

initAssessment();
initTracking();
