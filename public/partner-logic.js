import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// --- স্টেবিলিটি এবং অথেনটিকেশন চেক ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // লগইন না থাকলে সরাসরি বের করে দেবে
        window.location.replace("login.html");
    } else {
        // লগইন থাকলে লোডার সরিয়ে মেইন পেজ দেখাবে
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        startDashboard(); // ড্যাশবোর্ড ডাটা লোড শুরু করো
    }
});

function startDashboard() {
    let currentComm = 0;

    // ১. ইউনিভার্সিটি সার্চ লজিক
    window.runSearch = async () => {
        const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
        const fDegree = document.getElementById('fDegree').value;
        const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
        const tbody = document.getElementById('uniResultsBody');
        
        document.getElementById('resArea').style.display = 'block';
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching Universities...</td></tr>';

        try {
            const querySnapshot = await getDocs(collection(db, "universities"));
            let rows = "";
            querySnapshot.forEach(doc => {
                const u = doc.data();
                const fee = parseFloat(u.semesterFee) || 0;
                const pComm = parseFloat(u.partnerComm) || 0;
                const minGPA = parseFloat(u.minGPA) || 0;

                if ((!fCountry || u.country.toLowerCase().includes(fCountry)) && (!fDegree || u.degreeType === fDegree) && (fGPA >= minGPA)) {
                    const commCalculated = Math.round((fee * 120 * pComm) / 100);
                    rows += `<tr>
                        <td><b>${u.universityName}</b></td>
                        <td>${u.country}</td>
                        <td>${u.degreeType}</td>
                        <td>${u.courseName}</td>
                        <td>$${fee}</td>
                        <td style="color:#00ff00; font-weight:bold;">৳ ${commCalculated.toLocaleString()}</td>
                        <td>${minGPA}</td>
                        <td>${u.ieltsO || 'N/A'}</td>
                        <td>${u.scholarship || '0%'}</td>
                        <td>${u.intake || 'N/A'}</td>
                        <td><button class="btn-gold" style="padding: 5px 10px;" onclick="openApp('${u.universityName}', ${commCalculated})">OPEN FILE</button></td>
                    </tr>`;
                }
            });
            tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No match found.</td></tr>';
        } catch (e) { console.error("Search Error:", e); }
    };
    document.getElementById('runSearchBtn').onclick = window.runSearch;

    // ২. ওয়ালেট এবং ট্র্যাকিং (রিয়েল-টাইম)
    onSnapshot(collection(db, "applications"), (snap) => {
        let pending = 0;
        let available = 0;
        let trackingRows = "";
        
        snap.forEach(doc => {
            const d = doc.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            
            const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
            trackingRows += `<tr>
                <td>${d.studentName}</td>
                <td>${d.passport}</td>
                <td>${d.university}</td>
                <td><b style="color:#ffcc00">${d.status}</b></td>
                <td>${date}</td>
            </tr>`;
        });
        
        document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        document.getElementById('liveTrackingBody').innerHTML = trackingRows;
    });

    // ৩. ফাইল সাবমিট লজিক
    window.openApp = (uni, comm) => {
        document.getElementById('mTitle').innerText = uni;
        currentComm = comm;
        document.getElementById('appModal').style.display = 'flex';
    };

    document.getElementById('submitBtn').onclick = async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        if (!sName || !sPass) return alert("Please fill all student details!");

        try {
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passport: sPass,
                university: document.getElementById('mTitle').innerText,
                commissionBDT: currentComm,
                pendingAmount: 0,
                finalAmount: 0,
                status: "PENDING",
                timestamp: serverTimestamp()
            });
            
            document.getElementById('slipName').innerText = sName;
            document.getElementById('slipPass').innerText = sPass;
            document.getElementById('slipUni').innerText = document.getElementById('mTitle').innerText;
            document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
            
            document.getElementById('appModal').style.display = 'none';
            document.getElementById('slipOverlay').style.display = 'flex';
        } catch (e) { alert("Submission failed: " + e.message); }
    };

    // ৪. লগআউট (ব্লেজিং ফাস্ট এবং ক্লিন)
    document.getElementById('logoutBtn').onclick = () => {
        if(confirm("Are you sure you want to logout?")) {
            signOut(auth).then(() => {
                window.location.replace("login.html");
            });
        }
    };
}