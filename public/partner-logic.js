import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
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
const auth = getAuth(app);

let currentPartnerEmail = "";
let selectedUniData = null;

// 1. Auth Status & Security
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    } else {
        currentPartnerEmail = user.email;
        document.body.classList.add('auth-ready');
        document.getElementById('loader').style.display = 'none';
        loadDashboardData();
    }
});

// 2. Load Dashboard & Tracking
function loadDashboardData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", currentPartnerEmail));
    
    onSnapshot(q, (snap) => {
        let rows = "";
        let pendingComm = 0;
        let availWallet = 0;

        snap.forEach(doc => {
            const data = doc.data();
            pendingComm += parseFloat(data.pendingAmount || 0);
            availWallet += parseFloat(data.finalAmount || 0);

            rows += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNumber}</td>
                    <td>${data.university}</td>
                    <td><b style="color:${getStatusColor(data.status)}">${data.status}</b></td>
                    <td>${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'Pending'}</td>
                </tr>
            `;
        });

        document.getElementById('liveTrackingBody').innerHTML = rows || "<tr><td colspan='5'>No applications found.</td></tr>";
        document.getElementById('pendingAm').innerText = `৳ ${pendingComm.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${availWallet.toLocaleString()}`;
    });
}

function getStatusColor(status) {
    if (status === 'APPROVED') return '#2ecc71';
    if (status === 'REJECTED') return '#ff5e5e';
    return '#ffcc00';
}

// 3. Smart Assessment Search Logic
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.toUpperCase();
    const degree = document.getElementById('fDegree').value;
    const gpa = parseFloat(document.getElementById('fAcad').value) || 0;
    const ielts = parseFloat(document.getElementById('fScore').value) || 0;

    const resArea = document.getElementById('resArea');
    const resultsBody = document.getElementById('uniResultsBody');
    
    resultsBody.innerHTML = "<tr><td colspan='10'>Searching...</td></tr>";
    resArea.style.display = "block";

    const q = query(collection(db, "universities"));
    const querySnapshot = await getDocs(q);
    
    let html = "";
    querySnapshot.forEach((doc) => {
        const uni = doc.data();
        
        // Filtering Logic
        const matchCountry = !country || uni.country.toUpperCase().includes(country);
        const matchDegree = !degree || uni.degreeType === degree;
        const matchGPA = gpa >= parseFloat(uni.minGPA);
        
        if (matchCountry && matchDegree && matchGPA) {
            html += `
                <tr>
                    <td>${uni.universityName}</td>
                    <td>${uni.country}</td>
                    <td>${uni.degreeType}</td>
                    <td>${uni.courseName}</td>
                    <td>$${uni.semesterFee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${uni.partnerComm}</td>
                    <td>${uni.minGPA}</td>
                    <td>${uni.ieltsReq}</td>
                    <td>${uni.intake || 'All Year'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; font-size:10px;" onclick="openApplyModal('${doc.id}', '${uni.universityName}', '${uni.partnerComm}')">Apply File</button></td>
                </tr>
            `;
        }
    });

    resultsBody.innerHTML = html || "<tr><td colspan='10'>No universities found matching your criteria.</td></tr>";
};

// 4. Application Submission
window.openApplyModal = (id, name, comm) => {
    selectedUniData = { id, name, comm };
    document.getElementById('mTitle').innerText = name;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;

    if (!name || !pass) return alert("Please fill all fields");

    const btn = document.getElementById('submitBtn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const appData = {
            studentName: name,
            passportNumber: pass,
            university: selectedUniData.name,
            partnerEmail: currentPartnerEmail,
            pendingAmount: selectedUniData.comm,
            finalAmount: 0,
            status: "INCOMING",
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, "applications"), appData);

        // Show Slip
        document.getElementById('slipName').innerText = name;
        document.getElementById('slipPass').innerText = pass;
        document.getElementById('slipUni').innerText = selectedUniData.name;
        document.getElementById('slipDate').innerText = new Date().toLocaleString();
        
        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (e) {
        alert("Error submitting application: " + e.message);
    } finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
};

// 5. Logout
document.getElementById('logoutBtn').onclick = () => {
    signOut(auth).then(() => window.location.replace("index.html"));
};