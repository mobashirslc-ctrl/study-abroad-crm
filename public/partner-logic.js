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

// --- ১. ওয়ালেট এবং পেন্ডিং লজিক (রিয়েল টাইম) ---
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingTotal = 0;
    let availableTotal = 0;
    
    snap.forEach(doc => {
        const data = doc.data();
        const amount = parseFloat(data.commission) || 0;
        const status = (data.status || "").toLowerCase();

        // যদি স্ট্যাটাস Success বা Approved হয় তবে ওয়ালেটে যোগ হবে
        if (status === "success" || status === "approved" || status === "enrolled") {
            availableTotal += amount;
        } else if (status === "pending" || status === "processing") {
            pendingTotal += amount;
        }
    });

    document.getElementById('pendingAm').innerText = `৳ ${pendingTotal.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableTotal.toLocaleString()}`;
});

// --- ২. স্মার্ট অ্যাসেসমেন্ট সার্চ (অ্যাডমিন ডাটা কানেকশন ফিক্স) ---
window.runSearch = () => {
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Searching SCC Database...</td></tr>';

    // অ্যাডমিনের 'universities' কালেকশন থেকে ডাটা আনা
    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        snap.forEach(doc => {
            const u = doc.data();
            
            // ফিল্ড নেমগুলো অ্যাডমিন প্যানেলের সাথে ম্যাচ করানো হয়েছে
            const dbCountry = (u.country || u.CountryName || "").toLowerCase();
            const dbDegree = u.degree || u.Degree || "";
            const minGPA = parseFloat(u.minGPA || u.GPA || 0);
            const minIELTS = parseFloat(u.ieltsO || u.ieltsOverall || u.IELTS || 0);

            // ম্যাচিং কন্ডিশন
            const countryMatch = !fCountry || dbCountry.includes(fCountry);
            const degreeMatch = !fDegree || dbDegree === fDegree;
            const gpaMatch = fGPA >= minGPA;
            const ieltsMatch = fIELTS >= minIELTS;

            if (countryMatch && degreeMatch && gpaMatch && ieltsMatch) {
                // কমিশন ক্যালকুলেশন (অ্যাডমিনের পার্টনার কমিশন পার্সেন্টেজ অনুযায়ী)
                const partnerCommPercent = parseFloat(u.partnerComm || 0);
                const semesterFee = parseFloat(u.semesterFee || 0);
                const commCalculated = Math.round((semesterFee * 120 * partnerCommPercent) / 100);

                rows += `<tr>
                    <td><b>${u.universityName || u.University}</b></td>
                    <td>${u.country || u.Country}</td>
                    <td>${u.degree || u.Degree}</td>
                    <td>${u.courseName || u.Subject}</td>
                    <td>$${u.semesterFee || 0}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${commCalculated.toLocaleString()}</td>
                    <td>${minGPA}</td>
                    <td>${minIELTS}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.universityName || u.University}', ${commCalculated})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10" style="text-align:center;">No match found for your requirements.</td></tr>';
    });
};

// --- ৩. অ্যাপ্লিকেশন সাবমিট এবং স্লিপ জেনারেট ---
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm; // কমিশনের ভ্যালু স্টোর করা হচ্ছে
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const uniName = document.getElementById('mTitle').innerText;

    if (!sName || !sPass) return alert("Student Name and Passport are required!");

    document.getElementById('submitBtn').innerText = "Submitting...";
    document.getElementById('submitBtn').disabled = true;

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: uniName,
            commission: currentComm,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // স্লিপ ডাটা আপডেট
        document.getElementById('slipName').innerText = sName;
        document.getElementById('slipPass').innerText = sPass;
        document.getElementById('slipUni').innerText = uniName;
        document.getElementById('slipDate').innerText = new Date().toLocaleDateString();

        // QR Code জেনারেট (Passport Number দিয়ে ট্র্যাক করার জন্য)
        document.getElementById('qrcode').innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `https://scc-track.web.app/status?id=${sPass}`,
            width: 120,
            height: 120
        });

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';

    } catch (e) {
        alert("Error submitting application: " + e.message);
    } finally {
        document.getElementById('submitBtn').innerText = "Submit to Admin";
        document.getElementById('submitBtn').disabled = false;
    }
};

// --- ৪. ফাইল ট্র্যাকিং লিস্ট (রিয়েল টাইম) ---
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
        let statusColor = d.status === "Pending" ? "orange" : (d.status === "Success" || d.status === "Approved" ? "#00ff00" : "red");
        
        html += `<tr>
            <td>${d.studentName}</td>
            <td>${d.passport}</td>
            <td>${d.university}</td>
            <td><b style="color:${statusColor}">${d.status}</b></td>
            <td>${date}</td>
        </tr>`;
    });
    document.getElementById('liveTrackingBody').innerHTML = html;
});