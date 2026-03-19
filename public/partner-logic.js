/* partner-logic.js */
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

// --- Navigation Functions ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    if(el) el.classList.add('active');
};

window.logout = () => {
    localStorage.clear();
    location.href = 'index.html';
};

window.closeModal = () => {
    document.getElementById('applyModal').style.display = 'none';
};

// --- University Logic ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

document.getElementById('searchBtn').onclick = () => {
    const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
    const gpaInput = parseFloat(document.getElementById('fGPA').value) || 0;
    const langInput = parseFloat(document.getElementById('fLangScore').value) || 0;
    const degreeInput = document.getElementById('fDegree').value;

    const filtered = allUnis.filter(u => {
        const dbCountry = (u.uCountry || u.country || "").toLowerCase();
        const dbDegree = (u.uDegree || u.degree || "");
        const minGPA = parseFloat(u.minCGPA || u.minGPA || 0);
        const minLang = parseFloat(u.minIELTS || u.minLangScore || 0);

        const cMatch = countryInput === "" || dbCountry.includes(countryInput);
        const dMatch = degreeInput === "" || dbDegree === degreeInput || (degreeInput === "Bachelor" && dbDegree === "Ug");
        const gMatch = gpaInput >= minGPA;
        const lMatch = langInput >= minLang;

        return cMatch && dMatch && gMatch && lMatch;
    });

    const container = document.getElementById('uniListContainer');
    document.getElementById('searchResultArea').style.display = 'block';
    
    if (filtered.length > 0) {
        container.innerHTML = filtered.map(u => `
            <tr>
                <td><b>${u.uName || u.name}</b><br><small>${u.uCountry || u.country}</small></td>
                <td>GPA: ${u.minCGPA || 0} | IELTS: ${u.minIELTS || 0}</td>
                <td>${u.uSemFee || 0} ${u.uCurrency || 'USD'}</td>
                <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;" onclick="openApply('${u.uName || u.name}', '${u.partnerComm}')">Apply</button></td>
            </tr>`).join('');
    } else {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--danger);">No University found.</td></tr>`;
    }
};

window.openApply = (n, c) => {
    window.selectedApp = { name: n, comm: c };
    document.getElementById('modalUniName').innerText = n;
    document.getElementById('applyModal').style.display = 'flex';
};

// --- Application Logic ---
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('appSName').value;
    const pass = document.getElementById('appSPass').value;
    if(!name || !pass) return alert("Fill Name and Passport");

    const btn = document.getElementById('submitBtn');
    btn.innerText = "SUBMITTING..."; btn.disabled = true;

    try {
        await addDoc(collection(db, "applications"), {
            studentName: name, passportNo: pass, partnerEmail: userEmail,
            university: window.selectedApp.name, commission: window.selectedApp.comm,
            status: 'pending', createdAt: serverTimestamp()
        });
        alert("Application Submitted!"); 
        location.reload();
    } catch (e) { 
        alert("Failed!"); 
        btn.disabled = false; btn.innerText = "SUBMIT";
    }
};
