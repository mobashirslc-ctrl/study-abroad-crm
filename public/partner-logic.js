import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. SMART ASSESSMENT LOGIC
function initSmartSearch() {
    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const runFilter = () => {
            const country = document.getElementById('fCountry').value.toLowerCase();
            const degree = document.getElementById('fDegree').value;
            const lScore = parseFloat(document.getElementById('fLangScore').value) || 0;
            const gpa = parseFloat(document.getElementById('fGPA').value) || 0;

            const filtered = allUnis.filter(u => {
                // Admin matching logic
                const mCountry = u.country.toLowerCase().includes(country);
                const mDegree = degree === "" || u.degree === degree;
                const mLang = lScore >= (parseFloat(u.ieltsReq) || 0);
                const mGPA = gpa >= (parseFloat(u.minGPA) || 0);
                return mCountry && mDegree && mLang && mGPA;
            });
            renderTable(filtered);
        };

        ['fCountry', 'fDegree', 'fLangScore', 'fGPA'].forEach(id => {
            document.getElementById(id).addEventListener('input', runFilter);
        });
        runFilter();
    });
}

function renderTable(unis) {
    const tbody = document.getElementById('assessmentResults');
    tbody.innerHTML = unis.map(u => {
        const comm = ((u.semesterFee * u.partnerComm) / 100) * 120;
        return `<tr>
            <td><b>${u.universityName}</b></td>
            <td>${u.country}</td>
            <td><span class="badge">${u.degree}</span><br><small>Min: ${u.ieltsReq}</small></td>
            <td>$${u.semesterFee.toLocaleString()}</td>
            <td style="color:var(--success); font-weight:bold;">৳ ${comm.toLocaleString()}</td>
            <td><button class="btn-gold" onclick="openApply('${u.universityName}', ${u.partnerComm}, ${u.semesterFee})">Apply</button></td>
        </tr>`;
    }).join('');
    document.getElementById('matchCount').innerText = `${unis.length} Found`;
}

// 2. APPLY & FILE UPLOAD
window.openApply = (name, comm, fee) => {
    document.getElementById('targetUni').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.tempData = { name, comm, fee };
};

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    btn.innerText = "Uploading..."; btn.disabled = true;

    try {
        const files = ['pdf1', 'pdf2', 'pdf3', 'pdf4'];
        let links = {};
        for (let id of files) {
            const f = document.getElementById(id).files[0];
            if (f) {
                const fd = new FormData();
                fd.append("file", f); fd.append("upload_preset", "ihp_upload");
                const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: fd });
                const d = await res.json();
                links[id] = d.secure_url; // Direct View Link
            }
        }

        await addDoc(collection(db, "applications"), {
            studentName: document.getElementById('sName').value,
            passportNo: document.getElementById('sPass').value,
            university: window.tempData.name,
            commission: (window.tempData.fee * window.tempData.comm / 100) * 120,
            partnerEmail: localStorage.getItem('userEmail'),
            partnerName: localStorage.getItem('partnerName'),
            status: 'processing',
            docs: links,
            createdAt: serverTimestamp()
        });

        alert("Application Submitted!"); location.reload();
    } catch (e) { alert(e.message); btn.innerText = "Confirm Submission"; btn.disabled = false; }
};

// 3. TRACKING LOGIC
function initTracking() {
    onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
        const tbody = document.getElementById('trackingBody');
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const viewLink = d.docs?.pdf1 ? `<a href="${d.docs.pdf1}" target="_blank" style="color:var(--gold);"><i class="fas fa-eye"></i> View Docs</a>` : 'No Docs';
            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.university}</td>
                <td>${viewLink}</td>
                <td><span class="badge" style="color:var(--gold);">${d.status.toUpperCase()}</span></td>
                <td>${d.createdAt?.toDate().toLocaleDateString() || 'Now'}</td>
            </tr>`;
        });
    });
}

initSmartSearch(); initTracking();
