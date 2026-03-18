import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, updateDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- ১. অ্যাসেসমেন্ট এবং সার্চ বক্স লজিক ---
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
    renderUniTable(allUnis);
});

function renderUniTable(data) {
    const tbody = document.getElementById('uniList');
    tbody.innerHTML = data.map(u => {
        const comm = (parseFloat(u.semesterFee) * parseFloat(u.partnerComm) / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
            <td>Gap: ${u.studyGap}y | Intake: ${u.intake}</td>
            <td>Fee: $${u.semesterFee}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${comm.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${comm})">Apply</button></td>
        </tr>`;
    }).join('');
}

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLangType').value;
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const score = parseFloat(document.getElementById('fLang').value) || 0;

    const filtered = allUnis.filter(u => {
        return (country === "" || u.country.toLowerCase().includes(country)) &&
               (degree === "" || u.degree === degree) &&
               (lang === "" || u.langTest === lang) &&
               (parseFloat(u.minGPA) >= gpa);
    });
    renderUniTable(filtered);
};

// --- ২. Apply Button Fix ---
window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentAppData = { name, commission };
};

// --- ৩. ট্র্যাকিং এবং ওয়ালেট লজিক ---
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
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td><a href="#" target="_blank" style="color:var(--gold)">View Doc</a></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...'}</td>
            </tr>`;
        });
        document.getElementById('topPending').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${final.toLocaleString()}`;
        document.getElementById('withdrawDisplay').innerText = `৳ ${final.toLocaleString()}`;
        
        const btn = document.getElementById('withdrawBtn');
        if(final > 0) { btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; }
    });
}

// --- ৪. সাবমিট ফাইল লজিক ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    if(!sName || !sPass) return alert("Fill Name/Passport!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName, passportNo: sPass,
            university: window.currentAppData.name, commission: window.currentAppData.commission,
            partnerEmail: userEmail, status: 'pending', createdAt: serverTimestamp()
        });
        
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipUni').innerText = window.currentAppData.name;
        new QRCode(document.getElementById("qrcode"), { text: sPass, width: 100, height: 100 });
        document.getElementById('printArea').style.display = 'block';
        setTimeout(() => { window.print(); location.reload(); }, 1200);
    } catch (e) { alert("Failed!"); }
};

// --- ৫. প্রোফাইল এবং পেমেন্ট সেভ লজিক ---
document.getElementById('saveProfileBtn').onclick = async () => {
    const agency = document.getElementById('setAgencyName').value;
    const phone = document.getElementById('setPhone').value;
    const method = document.getElementById('setPayMethod').value;
    const details = document.getElementById('setPayDetails').value;

    try {
        const q = query(collection(db, "partners"), where("email", "==", userEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(doc(db, "partners", snap.docs[0].id), {
                agencyName: agency, phone: phone, paymentMethod: method, paymentDetails: details
            });
            alert("Settings Saved!");
        }
    } catch (e) { alert("Save Error!"); }
};

initTracking();
