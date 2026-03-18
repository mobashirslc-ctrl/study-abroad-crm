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
const userId = localStorage.getItem('userId');
const partnerName = localStorage.getItem('partnerName') || 'Partner';
document.getElementById('partnerNameDisplay').innerText = partnerName;

// --- ১. প্রোফাইল লোড ও আপডেট ---
async function loadProfile() {
    if (!userId) return;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        const data = userDoc.data();
        document.getElementById('pName').value = data.fullName || '';
        document.getElementById('pAgency').value = data.agencyName || '';
        document.getElementById('pPhone').value = data.phone || '';
        document.getElementById('pAddress').value = data.address || '';
    }
}

document.getElementById('updateProfileBtn').onclick = async () => {
    const btn = document.getElementById('updateProfileBtn');
    btn.innerText = "Saving...";
    await updateDoc(doc(db, "users", userId), {
        agencyName: document.getElementById('pAgency').value,
        phone: document.getElementById('pPhone').value,
        address: document.getElementById('pAddress').value
    });
    alert("Profile Updated!");
    btn.innerText = "Save Profile";
};

// --- ২. স্মার্ট অ্যাসেসমেন্ট ফিল্টার ---
let allUnis = [];
function initAssessment() {
    onSnapshot(collection(db, "universities"), (snap) => {
        allUnis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        runFilter();
    });

    ['fCountry', 'fDegree', 'fLangType', 'fGPA', 'fLang'].forEach(id => {
        document.getElementById(id).addEventListener('input', runFilter);
    });
}

function runFilter() {
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

    const tbody = document.getElementById('uniList');
    document.getElementById('matchCount').innerText = `${filtered.length} found`;
    tbody.innerHTML = filtered.map(u => {
        const commBDT = (parseFloat(u.semesterFee) * parseFloat(u.partnerComm) / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b></td>
            <td>GPA: ${u.minGPA} | IELTS: ${u.ieltsReq}</td>
            <td>$${u.semesterFee}</td>
            <td style="color:#2ecc71; font-weight:bold;">৳ ${commBDT.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${commBDT})">Apply</button></td>
        </tr>`;
    }).join('');
}

window.openApply = (name, commission) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentApp = { name, commission };
};

// --- ৩. ক্লাউডিনারি আপলোড ও সাবমিশন ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    if(!sName || !sPass) return alert("Fill student details!");

    btn.innerText = "Uploading Files...";
    btn.disabled = true;

    try {
        const files = ['pdfAcademic', 'pdfPassport', 'pdfLanguage', 'pdfOthers'];
        let urls = {};
        for(let id of files) {
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
            passportNo: sPass,
            university: window.currentApp.name,
            commission: window.currentApp.commission,
            partnerEmail: userEmail,
            partnerName: partnerName,
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        });

        alert("Application Submitted!");
        location.reload();
    } catch (e) { alert("Error!"); btn.disabled = false; }
};

// --- ৪. আর্নিং ও ট্র্যাকিং ---
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        let pTotal = 0; let fTotal = 0;
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            if(d.status === 'pending') pTotal += d.commission;
            if(d.status === 'approved') fTotal += d.commission;

            tbody.innerHTML += `<tr>
                <td>${d.studentName}</td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span style="color:var(--gold)">${d.status.toUpperCase()}</span></td>
                <td>${d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : ''}</td>
            </tr>`;
        });
        document.getElementById('pendingEarn').innerText = `৳ ${pTotal.toLocaleString()}`;
        document.getElementById('finalEarn').innerText = `৳ ${fTotal.toLocaleString()}`;
        if(fTotal > 0) document.getElementById('withdrawBtn').disabled = false;
    });
}

loadProfile();
initAssessment();
initTracking();
