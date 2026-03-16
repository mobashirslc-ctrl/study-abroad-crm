import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// --- ১. অথেন্টিকেশন চেক ও লোডার হ্যান্ডেলিং ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    } else {
        currentPartnerEmail = user.email;
        // ডিজাইনের সাথে ম্যাচ করে বডি শো করা
        document.body.classList.add('auth-ready');
        document.getElementById('loader').style.display = 'none';
        loadPartnerData();
    }
});

// --- ২. ড্যাশবোর্ড এবং ট্র্যাকিং ডাটা লোড ---
function loadPartnerData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", currentPartnerEmail));
    
    onSnapshot(q, (snap) => {
        let rows = "";
        let pendingTotal = 0;
        let availableTotal = 0;

        snap.forEach(doc => {
            const data = doc.data();
            pendingTotal += parseFloat(data.pendingAmount || 0);
            availableTotal += parseFloat(data.finalAmount || 0);

            const statusColor = data.status === 'APPROVED' ? '#2ecc71' : (data.status === 'REJECTED' ? '#ff5e5e' : '#ffcc00');
            
            rows += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNumber}</td>
                    <td>${data.university}</td>
                    <td><b style="color:${statusColor}">${data.status}</b></td>
                    <td>${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'Pending'}</td>
                </tr>
            `;
        });

        // UI আপডেট (আপনার আইডি অনুযায়ী)
        document.getElementById('liveTrackingBody').innerHTML = rows || "<tr><td colspan='5'>No records found.</td></tr>";
        document.getElementById('pendingAm').innerText = `৳ ${pendingTotal.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${availableTotal.toLocaleString()}`;
    });
}

// --- ৩. স্মার্ট অ্যাসেসমেন্ট সার্চ (ফিল্টারিং) ---
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.trim().toUpperCase();
    const degree = document.getElementById('fDegree').value;
    const gpa = parseFloat(document.getElementById('fAcad').value) || 0;
    const ielts = parseFloat(document.getElementById('fScore').value) || 0;

    const resArea = document.getElementById('resArea');
    const resultsBody = document.getElementById('uniResultsBody');
    
    resultsBody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>Searching Databases...</td></tr>";
    resArea.style.display = "block";

    try {
        const q = query(collection(db, "universities"));
        const snap = await getDocs(q);
        let html = "";

        snap.forEach((doc) => {
            const uni = doc.data();
            
            // স্মার্ট ফিল্টার লজিক
            const matchCountry = !country || uni.country.toUpperCase().includes(country);
            const matchDegree = !degree || uni.degreeType === degree;
            const matchGPA = gpa >= parseFloat(uni.minGPA || 0);
            const matchIELTS = ielts >= parseFloat(uni.ieltsReq || 0);

            if (matchCountry && matchDegree && matchGPA && matchIELTS) {
                html += `
                    <tr>
                        <td>${uni.universityName}</td>
                        <td>${uni.country}</td>
                        <td>${uni.degreeType}</td>
                        <td>${uni.courseName || 'General'}</td>
                        <td>${uni.semesterFee || 'N/A'}</td>
                        <td style="color:#00ff00; font-weight:bold;">৳ ${uni.partnerComm || '0'}</td>
                        <td>${uni.minGPA}</td>
                        <td>${uni.ieltsReq}</td>
                        <td>${uni.intake || 'Any'}</td>
                        <td><button class="btn-gold" style="padding:5px 10px; font-size:10px; width:auto;" onclick="openModal('${doc.id}', '${uni.universityName}', '${uni.partnerComm}')">Apply File</button></td>
                    </tr>
                `;
            }
        });

        resultsBody.innerHTML = html || "<tr><td colspan='10' style='text-align:center;'>No matching university found for your score.</td></tr>";
    } catch (err) {
        console.error(err);
        resultsBody.innerHTML = "<tr><td colspan='10' style='color:red;'>Error loading data.</td></tr>";
    }
};

// --- ৪. অ্যাপ্লিকেশন মডাল এবং সাবমিশন ---
window.openModal = (id, name, comm) => {
    selectedUniData = { id, name, comm };
    document.getElementById('mTitle').innerText = name;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value.trim();
    const sPass = document.getElementById('sPass').value.trim();

    if (!sName || !sPass) return alert("Please enter Student Name and Passport Number.");

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNumber: sPass,
            university: selectedUniData.name,
            partnerEmail: currentPartnerEmail,
            pendingAmount: parseFloat(selectedUniData.comm || 0),
            finalAmount: 0,
            status: "INCOMING",
            timestamp: serverTimestamp()
        });

        // স্লিপ ওভারলে শো করা (আপনার ডিজাইন অনুযায়ী)
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipPass').innerText = sPass;
        document.getElementById('slipUni').innerText = selectedUniData.name;
        document.getElementById('slipDate').innerText = new Date().toLocaleString();
        
        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (error) {
        alert("Submission failed: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
};

// --- ৫. লগআউট ---
document.getElementById('logoutBtn').onclick = () => {
    signOut(auth).then(() => window.location.replace("index.html"));
};