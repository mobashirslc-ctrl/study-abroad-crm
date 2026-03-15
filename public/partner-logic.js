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

// ১. রিয়েলটাইম ইউনিভার্সিটি সার্চ
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Fetching Realtime Data...</td></tr>';

    // অ্যাডমিন প্যানেল থেকে ডাটা আনা
    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            rows += `
            <tr>
                <td>${u.name}</td><td>${u.degree}</td><td>${u.subject}</td><td>${u.currency} ${u.semesterFee}</td>
                <td style="color:#00ff00; font-weight:bold;">৳ ${u.commission || 0}</td>
                <td>${u.gapAllowed}</td><td>${u.minGPA}</td><td>${u.langScore}</td>
                <td>${u.scholarship}</td><td>${u.intake}</td>
                <td><button class="btn-gold" style="padding:5px 10px; width:auto;" onclick="openApp('${u.name}')">Open File</button></td>
            </tr>`;
        });
        tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center;">No Records Found in Admin.</td></tr>';
    });
};

// ২. ফাইল সাবমিট এবং স্লিপ জেনারেশন
window.openApp = (u) => { 
    curUni = u; 
    document.getElementById('mTitle').innerText = u; 
    document.getElementById('appModal').style.display = 'flex'; 
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;

    if(!name || !pass) return alert("Fill Name and Passport!");

    try {
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            passport: pass,
            university: curUni,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // স্লিপে ডাটা বসানো
        document.getElementById('slipNameDisp').innerText = name;
        document.getElementById('slipPassDisp').innerText = pass;
        document.getElementById('slipUniDisp').innerText = curUni;
        document.getElementById('slipDateDisp').innerText = new Date().toLocaleDateString();
        
        // QR Code জেনারেট
        document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${docRef.id}`;

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
    } catch (e) { alert(e.message); }
};

// ৩. লাইভ ফাইল ট্র্যাকিং (রিয়েলটাইম আপডেট)
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = ""; 
    snap.forEach(doc => { 
        const d = doc.data(); 
        const date = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : 'Just now';
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${date}</td></tr>`; 
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});