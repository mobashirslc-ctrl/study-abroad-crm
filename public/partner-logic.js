import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "YOUR_KEY", 
    authDomain: "YOUR_DOMAIN", 
    projectId: "YOUR_ID", 
    storageBucket: "YOUR_BUCKET", 
    messagingSenderId: "YOUR_SENDER", 
    appId: "YOUR_APP" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let curUni = "";
let selectedUniCommission = 0;

// ১. ইউনিভার্সিটি সার্চ লজিক
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Loading Realtime Data...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            // এখানে আপনি আপনার ফিল্টার লজিক অ্যাড করতে পারেন
            rows += `
            <tr>
                <td>${u.name}</td><td>${u.degree}</td><td>${u.subject}</td><td>${u.currency} ${u.semesterFee}</td>
                <td style="color:#00ff00; font-weight:bold;">৳ ${Math.round(u.commission || 0).toLocaleString()}</td>
                <td>${u.gapAllowed}</td><td>${u.minGPA}</td><td>${u.langScore}</td>
                <td>${u.scholarship}</td><td>${u.intake}</td>
                <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.name}', ${u.commission})">Open File</button></td>
            </tr>`;
        });
        tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No Data Found</td></tr>';
    });
};

// ২. পপআপ ওপেন করা
window.openApp = (u, comm) => { 
    curUni = u; 
    selectedUniCommission = comm;
    document.getElementById('mTitle').innerText = u; 
    document.getElementById('appModal').style.display = 'flex'; 
};

// ৩. সাবমিট বাটন অ্যাক্টিভেশন (FIXED)
document.getElementById('submitBtn').addEventListener('click', async () => {
    const name = document.getElementById('sName').value.trim();
    const pass = document.getElementById('sPass').value.trim();
    const btn = document.getElementById('submitBtn');

    if(!name || !pass) {
        alert("Please enter Student Name and Passport Number!");
        return;
    }

    try {
        btn.innerText = "Processing...";
        btn.disabled = true;

        // ফায়ারবেসে ডাটা সেভ
        const docRef = await addDoc(collection(db, "applications"), { 
            studentName: name, 
            passport: pass, 
            university: curUni, 
            status: "Pending", 
            partner: "GORUN LTD.", 
            commission: selectedUniCommission,
            timestamp: serverTimestamp() 
        });

        // স্লিপ ডাটা আপডেট (আপনার স্ক্রিনশটের ডিজাইন অনুযায়ী)
        document.getElementById('slipNameDisp').innerText = name;
        document.getElementById('slipPassDisp').innerText = pass;
        document.getElementById('slipDateDisp').innerText = new Date().toLocaleDateString('en-GB');
        
        // QR Code জেনারেট (Tracking ID সহ)
        const qrData = `STUDENT:${name}|PASS:${pass}|UNI:${curUni}|ID:${docRef.id}`;
        document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

        // পপআপ বন্ধ করে স্লিপ দেখানো
        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
        
        // ইনপুট রিসেট
        document.getElementById('sName').value = "";
        document.getElementById('sPass').value = "";

    } catch(e) {
        alert("Submission Error: " + e.message);
    } finally {
        btn.innerText = "Submit to Admin";
        btn.disabled = false;
    }
});

// ৪. রিয়েলটাইম ট্র্যাকিং লিস্ট
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = ""; 
    snap.forEach(doc => { 
        const d = doc.data(); 
        const date = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : 'Just now';
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${date}</td></tr>`; 
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});