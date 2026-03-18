import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const userId = localStorage.getItem('userId');
const partnerName = localStorage.getItem('partnerName') || 'Partner';
document.getElementById('partnerNameDisplay').innerText = partnerName;

let allUnis = [];

// --- ১. অ্যাসেসমেন্ট লজিক ---
function initAssessment() {
    onSnapshot(collection(db, "universities"), (snap) => {
        allUnis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUniTable(allUnis);
    });

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
            <td><b>${u.universityName}</b><br><small>${u.country || 'N/A'}</small></td>
            <td>Gap: ${u.studyGap || 'N/A'}y | Intake: ${u.intake || 'N/A'}</td>
            <td>Fee: $${u.semesterFee}<br>Living: $${u.livingCost || 'N/A'}</td>
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

// --- ২. সাবমিশন এবং স্লিপ জেনারেশন ---
document.getElementById('submitAppBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const sContact = document.getElementById('sContact').value;
    const sGap = document.getElementById('sGap').value;

    if(!sName || !sPass) return alert("Fill mandatory fields!");

    const btn = document.getElementById('submitAppBtn');
    btn.innerText = "Processing Files...";
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
            studentName: sName,
            contactNo: sContact,
            passportNo: sPass,
            studyGap: sGap,
            university: window.currentApp.name,
            commission: window.currentApp.commission,
            partnerEmail: userEmail,
            partnerName: partnerName,
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        });

        // Trigger Print Slip
        generateSlip(sName, sPass, window.currentApp.name);

    } catch (e) { alert("Upload Failed!"); btn.disabled = false; }
};

function generateSlip(name, pass, uni) {
    document.getElementById('slipName').innerText = name;
    document.getElementById('slipPass').innerText = pass;
    document.getElementById('slipUni').innerText = uni;
    document.getElementById('slipPartner').innerText = partnerName;
    document.getElementById('slipAgency').innerText = localStorage.getItem('agencyName') || 'N/A';

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: "https://study-abroad-crm-nine.vercel.app/track.html?id=" + pass,
        width: 100, height: 100
    });

    setTimeout(() => { window.print(); location.reload(); }, 1000);
}

// --- ৩. ট্র্যাকিং ফিক্স ---
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        let current = 0, success = 0, reject = 0, totalEarn = 0, pendingEarn = 0, finalEarn = 0;
        
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const comm = d.commission || 0;
            if(d.status === 'pending') { current++; pendingEarn += comm; }
            else if(d.status === 'approved') { success++; finalEarn += comm; totalEarn += comm; }
            else if(d.status === 'rejected') { reject++; }

            const dateStr = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : '...';
            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.contactNo || 'N/A'}</td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td><a href="${d.docs?.pdfAcademic || '#'}" target="_blank" style="color:var(--gold)">View PDF</a></td>
                <td>${dateStr}</td>
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
