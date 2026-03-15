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

let currentComm = 0;

// --- ১. অ্যাডমিন ডাটা এবং পার্টনার প্যানেল সিঙ্ক (Search Fix) ---
window.runSearch = () => {
    const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Searching SCC Database...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            
            // আপনার অ্যাডমিন প্যানেলের স্ক্রিনশট অনুযায়ী নিখুঁত ম্যাপিং:
            const uniName = u.universityName || u["University Name"] || "N/A";
            const country = u.country || u["Country"] || "N/A";
            const degree = u.degreeType || u["Degree Type"] || u.degree || "N/A";
            const course = u.courseName || u["Course Name"] || "N/A";
            const fee = parseFloat(u.semesterFee || u["Semester Fee (Num)"] || 0);
            const pCommPercent = parseFloat(u.partnerComm || u["Partner Comm (%)"] || 0);
            const minGPA = parseFloat(u.minGPA || u["Gap Acceptance"] || 0); // বা আপনার সেট করা নির্দিষ্ট ফিল্ড
            const minIELTS = parseFloat(u.ieltsO || u["IELTS Overall"] || 0);

            // সার্চ ফিল্টার লজিক
            if ((!fCountry || country.toLowerCase().includes(fCountry)) && 
                (!fDegree || degree === fDegree) && 
                (fGPA >= minGPA) && (fIELTS >= minIELTS)) {
                
                // ক্যালকুলেশন: ফি * এক্সচেঞ্জ রেট (১২০) * কমিশন পারসেন্টেজ
                const commCalculated = Math.round((fee * 120 * pCommPercent) / 100);
                
                rows += `<tr>
                    <td><b>${uniName}</b></td>
                    <td>${country}</td>
                    <td>${degree}</td>
                    <td>${course}</td>
                    <td>$${fee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${commCalculated.toLocaleString()}</td>
                    <td>${minGPA}</td>
                    <td>${minIELTS}</td>
                    <td>${u.intake || 'Jan/Sept'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${uniName}', ${commCalculated})">OPEN FILE</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10" style="text-align:center; color:red;">দুঃখিত! অ্যাডমিন প্যানেলে ডাটা থাকলেও ফিল্টারের সাথে মিলছে না।</td></tr>';
    });
};

// --- ২. ওয়ালেট এবং পেন্ডিং ব্যালেন্স ফিক্স ---
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingBalance = 0;
    let availableBalance = 0;
    
    snap.forEach(doc => {
        const d = doc.data();
        const amt = parseFloat(d.commission) || 0;
        const status = (d.status || "").toLowerCase();

        // অ্যাডমিন যখন Status "Success" বা "Approved" করবে তখন ওয়ালেটে আসবে
        if (status === "success" || status === "approved") {
            availableBalance += amt;
        } else {
            pendingBalance += amt;
        }
    });

    document.getElementById('pendingAm').innerText = `৳ ${pendingBalance.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableBalance.toLocaleString()}`;
});

// --- ৩. ফাইল ট্র্যাকিং এবং স্লিপ লজিক ---
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const uniName = document.getElementById('mTitle').innerText;

    if (!sName || !sPass) return alert("সবগুলো তথ্য প্রদান করুন!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: uniName,
            commission: currentComm,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // স্লিপ প্রদর্শন
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipPass').innerText = sPass;
        document.getElementById('slipUni').innerText = uniName;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-track.web.app/track?id=${sPass}`,
            width: 120, height: 120
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
    } catch (e) { alert("Error: " + e.message); }
};

// রিয়েল টাইম ট্র্যাকিং লিস্ট
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let list = "";
    snap.forEach(doc => {
        const d = doc.data();
        list += `<tr>
            <td>${d.studentName}</td>
            <td>${d.passport}</td>
            <td>${d.university}</td>
            <td><b style="color:orange">${d.status}</b></td>
            <td>${d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Just Now'}</td>
        </tr>`;
    });
    document.getElementById('liveTrackingBody').innerHTML = list;
});