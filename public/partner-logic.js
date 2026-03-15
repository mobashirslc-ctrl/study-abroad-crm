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

// ১. ইউজারের নাম এবং স্টেটাস চেক
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

// ২. স্মার্ট অ্যাসেসমেন্ট (ফিল্টারিং লজিক)
window.smartSearch = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const langType = document.getElementById('fLangType').value;
    const acadScore = document.getElementById('fAcadScore').value;
    const langScore = document.getElementById('fLangScore').value;

    const resultsArea = document.getElementById('assessmentResults');
    const tbody = document.getElementById('uniResultsBody');
    
    resultsArea.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Searching for matching universities...</td></tr>";

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let count = 0;

        snap.forEach(doc => {
            const u = doc.data();
            
            // ফিল্টার কন্ডিশন (এখানে অ্যাডমিন থেকে আসা ২১টি ফিল্ডের ডেটা চেক করা হবে)
            let isMatch = true;
            if (country && !u.country.toLowerCase().includes(country)) isMatch = false;
            // এখানে আপনি চাইলে আরও কঠোর ফিল্টারিং (Score mapping) যোগ করতে পারেন

            if (isMatch) {
                count++;
                rows += `
                <tr>
                    <td style="color:var(--gold); font-weight:bold">${u.name}</td>
                    <td>${u.country}</td>
                    <td>${u.intake}</td>
                    <td>${u.tuitionFee}</td>
                    <td>${u.initialPayment || 'N/A'}</td>
                    <td>${u.scholarship || 'N/A'}</td>
                    <td>${u.requirement || 'View'}</td>
                    <td>${u.englishScore || 'N/A'}</td>
                    <td>${u.casTime || 'N/A'}</td>
                    <td style="color:#00ff00">${u.successRate || 'High'}</td>
                    <td>
                        <button class="btn-gold" style="padding:6px 12px; font-size:10px;" onclick="openApp('${u.name}')">Open File</button>
                    </td>
                </tr>`;
            }
        });

        if (count > 0) {
            tbody.innerHTML = rows;
        } else {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px; color: #ff5e5e;'>No universities match your criteria. Please contact SCC Admin.</td></tr>";
        }
    });
};

// ৩. অ্যাপ্লিকেশন মোডাল এবং সাবমিশন
window.openApp = (uniName) => {
    document.getElementById('mTitle').innerText = uniName;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const phone = document.getElementById('sPhone').value;
    const pass = document.getElementById('sPass').value;
    const btn = document.getElementById('submitBtn');

    if (!name || !phone || !pass) return alert("Please fill all student details!");

    try {
        btn.disabled = true;
        btn.innerText = "Submitting...";

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            contactNo: phone,
            passportNo: pass,
            university: document.getElementById('mTitle').innerText,
            status: "Pending",
            complianceMember: "Unassigned",
            partnerName: document.getElementById('userName').innerText,
            partnerUID: auth.currentUser.uid,
            timestamp: new Date().toISOString(),
            dateTime: new Date().toLocaleString()
        });

        alert("Application Submitted! ID: " + docRef.id);
        
        // ফর্ম ক্লিয়ার করা
        document.getElementById('sName').value = "";
        document.getElementById('sPhone').value = "";
        document.getElementById('sPass').value = "";
        document.getElementById('appModal').style.display = 'none';
        
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit & Generate Slip";
    }
};

// ৪. রিয়েল-টাইম ফাইল ট্র্যাকিং
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        html += `
            <tr>
                <td>${d.studentName}</td>
                <td>${d.contactNo}</td>
                <td>${d.passportNo}</td>
                <td><span style="background:rgba(255,204,0,0.1); color:var(--gold); padding:4px 8px; border-radius:4px;">${d.status}</span></td>
                <td>${d.complianceMember}</td>
                <td>${d.dateTime}</td>
            </tr>`;
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = html);
});

// ৫. লগআউট
document.getElementById('logoutBtn').onclick = () => signOut(auth);