import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- Firebase Configuration ---
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
const storage = getStorage(app);

// --- User Session ---
const partnerEmail = localStorage.getItem('userEmail');
const partnerId = localStorage.getItem('userId');

if (!partnerEmail) {
    window.location.href = 'index.html';
}

// --- 1. Load Stats (Dashboard) ---
function loadDashboardStats() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let total = snap.size;
        let pending = 0;
        let totalComm = 0;

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') pending++;
            if (data.commStatus === 'paid') totalComm += (data.commission || 0);
        });

        document.getElementById('statTotalStudents').innerText = total;
        document.getElementById('statActiveFiles').innerText = pending;
        document.getElementById('statEarnings').innerText = "৳ " + (totalComm * 120).toLocaleString(); // USD to BDT
        document.getElementById('walletBalance').innerText = "৳ " + (totalComm * 120).toLocaleString();
    });
}

// --- 2. Smart Assessment (Search & Filter) ---
function initSearch() {
    const uniTable = document.getElementById('assessmentResults');
    const fCountry = document.getElementById('fCountry');
    const fDegree = document.getElementById('fDegree');
    const fLang = document.getElementById('fLangType');

    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const filterData = () => {
            const countryVal = fCountry.value.toLowerCase();
            const degreeVal = fDegree.value;
            const langVal = fLang.value.toLowerCase();

            const filtered = allUnis.filter(u => {
                return (u.country.toLowerCase().includes(countryVal)) &&
                       (degreeVal === "" || u.degree === degreeVal) &&
                       (langVal === "" || u.ieltsReq.toLowerCase().includes(langVal));
            });

            renderUnis(filtered);
        };

        fCountry.oninput = filterData;
        fDegree.onchange = filterData;
        fLang.onchange = filterData;

        filterData(); // Initial load
    });
}

function renderUnis(unis) {
    const container = document.getElementById('assessmentResults');
    document.getElementById('matchCount').innerText = `${unis.length} Universities Found`;
    
    container.innerHTML = unis.map(u => `
        <tr>
            <td><b>${u.universityName}</b><br><small>Rank: #${u.rank}</small></td>
            <td>${u.country}</td>
            <td><span class="badge">${u.degree}</span><br><small>${u.ieltsReq}</small></td>
            <td>$${u.semesterFee}</td>
            <td style="color:#2ecc71; font-weight:bold;">${u.partnerComm}%</td>
            <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', '${u.id}', ${u.partnerComm}, ${u.semesterFee})">Apply</button></td>
        </tr>
    `).join('');
}

// --- 3. Application Submission ---
window.openApplyModal = (name, id, comm, fee) => {
    document.getElementById('targetUni').innerText = name;
    document.getElementById('sUni').value = name;
    document.getElementById('studentFormModal').style.display = 'flex';
    
    // Store temp data for submission
    window.currentAppData = { uniId: id, commPct: comm, fee: fee };
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    
    if(!sName || !sPass) return alert("Please fill mandatory fields!");

    try {
        btn.innerText = "Uploading Documents...";
        btn.disabled = true;

        // File Upload Logic
        const files = {
            passport: document.getElementById('filePassport').files[0],
            academic: document.getElementById('fileAcademic').files[0]
        };

        let urls = {};
        for (let key in files) {
            if (files[key]) {
                const storageRef = ref(storage, `docs/${Date.now()}_${files[key].name}`);
                const uploadSnap = await uploadBytes(storageRef, files[key]);
                urls[key] = await getDownloadURL(uploadSnap.ref);
            }
        }

        const appData = {
            studentName: sName,
            passportNo: sPass,
            phone: document.getElementById('sPhone').value,
            university: document.getElementById('sUni').value,
            commission: (window.currentAppData.fee * window.currentAppData.commPct) / 100,
            partnerEmail: partnerEmail,
            partnerName: localStorage.getItem('partnerName'),
            status: 'pending',
            docs: urls,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "applications"), appData);
        
        // Show Success Slip (Function in partner.html)
        window.showSuccessSlip({
            id: docRef.id,
            studentName: sName,
            university: appData.university
        });

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Confirm & Submit";
        btn.disabled = false;
    }
};

// --- 4. Tracking Table ---
function loadTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate().toLocaleDateString() || "Just now";
            html += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNo}</td>
                    <td>${data.university}</td>
                    <td><span class="badge" style="background:orange; color:black;">${data.status}</span></td>
                    <td><a href="${data.docs?.passport || '#'}" target="_blank" style="color:white;"><i class="fa-solid fa-file-pdf"></i> View</a></td>
                    <td>${date}</td>
                </tr>
            `;
        });
        document.getElementById('trackingBody').innerHTML = html;
    });
}

// Initialize Everything
loadDashboardStats();
initSearch();
loadTracking();
