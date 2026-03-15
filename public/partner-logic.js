import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// 1. Security & User Info
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().status === "approved") {
            document.getElementById('userName').innerText = userDoc.data().fullName;
            document.getElementById('profileName').innerText = userDoc.data().fullName;
        } else {
            await signOut(auth);
            window.location.replace("index.html");
        }
    } else {
        if (!window.location.pathname.includes("index.html")) window.location.replace("index.html");
    }
});

// 2. Smart Assessment (Filter Logic)
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLangType').value;
    
    const resultsDiv = document.getElementById('assessmentResults');
    const tbody = document.getElementById('uniResultsBody');
    
    resultsDiv.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='11' style='text-align:center'>Analyzing criteria...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            // Simple filtering match
            let match = true;
            if (country && !u.country.toLowerCase().includes(country)) match = false;
            
            if (match) {
                rows += `
                <tr>
                    <td style="color:var(--gold); font-weight:bold">${u.name}</td>
                    <td>${u.country}</td>
                    <td>${u.intake}</td>
                    <td>${u.tuitionFee}</td>
                    <td>${u.initialPayment || 'N/A'}</td>
                    <td>${u.scholarship || 'N/A'}</td>
                    <td>${u.requirement || 'Standard'}</td>
                    <td>${u.englishScore || 'N/A'}</td>
                    <td>${u.casTime || 'N/A'}</td>
                    <td style="color:#00ff00">${u.successRate || 'High'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; font-size:10px" onclick="openApp('${u.name}')">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || "<tr><td colspan='11' style='text-align:center'>No match found. Contact Admin.</td></tr>";
    });
};

// 3. Application Submission
window.openApp = (uni) => {
    document.getElementById('mTitle').innerText = uni;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPhone = document.getElementById('sPhone').value;
    const sPass = document.getElementById('sPass').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPhone || !sPass) return alert("Please fill basic info!");

    try {
        btn.disabled = true;
        btn.innerText = "Submitting File...";

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            contactNo: sPhone,
            passportNo: sPass,
            university: document.getElementById('mTitle').innerText,
            status: "Pending",
            complianceMember: "Waiting for Assign",
            partnerName: document.getElementById('userName').innerText,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });

        alert("File Submitted! Acknowledgement ID: " + docRef.id);
        window.print(); // Simple print slip
        document.getElementById('appModal').style.display = 'none';
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; btn.innerText = "Submit & Generate Slip"; }
};

// 4. Real-time Tracking
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        html += `<tr>
            <td>${d.studentName}</td>
            <td>${d.contactNo}</td>
            <td>${d.passportNo}</td>
            <td><span style="color:var(--gold)">${d.status}</span></td>
            <td>${d.complianceMember}</td>
            <td>${d.dateTime}</td>
        </tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
});

// 5. Logout
document.getElementById('logoutBtn').onclick = () => signOut(auth);