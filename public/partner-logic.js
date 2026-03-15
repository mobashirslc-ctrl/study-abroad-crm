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

// --- স্টেবিলিটি চেক: লগইন না থাকলে রিডাইরেক্ট ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        initApp(); // লগইন থাকলে অ্যাপ লোড করো
    }
});

function initApp() {
    let currentComm = 0;

    // ১. ইউনিভার্সিটি সার্চ
    window.runSearch = async () => {
        const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
        const fDegree = document.getElementById('fDegree').value;
        const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
        const tbody = document.getElementById('uniResultsBody');
        
        document.getElementById('resArea').style.display = 'block';
        tbody.innerHTML = '<tr><td colspan="4">Searching...</td></tr>';

        try {
            const querySnapshot = await getDocs(collection(db, "universities"));
            let rows = "";
            querySnapshot.forEach(doc => {
                const u = doc.data();
                const fee = parseFloat(u.semesterFee) || 0;
                const pComm = parseFloat(u.partnerComm) || 0;
                const minGPA = parseFloat(u.minGPA) || 0;

                if ((!fCountry || u.country.toLowerCase().includes(fCountry)) && (!fDegree || u.degreeType === fDegree) && (fGPA >= minGPA)) {
                    const comm = Math.round((fee * 120 * pComm) / 100);
                    rows += `<tr>
                        <td><b>${u.universityName}</b></td>
                        <td>${u.country}</td>
                        <td style="color:#00ff00;">৳ ${comm.toLocaleString()}</td>
                        <td><button class="btn-gold" style="padding:5px;" onclick="openApp('${u.universityName}', ${comm})">OPEN</button></td>
                    </tr>`;
                }
            });
            tbody.innerHTML = rows || '<tr><td colspan="4">No match found.</td></tr>';
        } catch (e) { console.error(e); }
    };
    document.getElementById('runSearchBtn').onclick = window.runSearch;

    // ২. রিয়েলটাইম লিসেনার (ওয়ালেট এবং ট্র্যাকিং)
    onSnapshot(collection(db, "applications"), (snap) => {
        let pending = 0; let available = 0; let trackHtml = "";
        snap.forEach(doc => {
            const d = doc.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
            trackHtml += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td>${d.status}</td><td>${date}</td></tr>`;
        });
        document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        document.getElementById('liveTrackingBody').innerHTML = trackHtml;
    });

    // ৩. সাবমিশন লজিক
    window.openApp = (uni, comm) => {
        document.getElementById('mTitle').innerText = uni;
        currentComm = comm;
        document.getElementById('appModal').style.display = 'flex';
    };

    document.getElementById('submitBtn').onclick = async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        if (!sName || !sPass) return alert("Fill data");

        await addDoc(collection(db, "applications"), {
            studentName: sName, passport: sPass, university: document.getElementById('mTitle').innerText,
            commissionBDT: currentComm, status: "PENDING", timestamp: serverTimestamp(),
            pendingAmount: 0, finalAmount: 0
        });
        document.getElementById('appModal').style.display = 'none';
        alert("Submitted Successfully!");
    };

    // ৪. লগআউট (পারফেক্টলি কাজ করবে)
    document.getElementById('logoutBtn').onclick = () => {
        if(confirm("Logout?")) {
            signOut(auth).then(() => window.location.replace("login.html"));
        }
    };
}