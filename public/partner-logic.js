import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ১. ফায়ারবেস কনফিগারেশন (আপনার প্রজেক্ট আইডি অনুযায়ী)
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

// ২. রিয়েল-টাইম ওয়ালেট আপডেট (Pending & Available Balance)
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingTotal = 0;
    let availableTotal = 0;
    snap.forEach(doc => {
        const data = doc.data();
        const comm = parseFloat(data.commission || 0);
        if (data.status === "Pending") pendingTotal += comm;
        else if (data.status === "Approved" || data.status === "Success") availableTotal += comm;
    });
    document.getElementById('pendingAm').innerText = `৳ ${pendingTotal.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableTotal.toLocaleString()}`;
});

// ৩. স্মার্ট রিয়েল-টাইম সার্চ (নতুন ডিগ্রি টাইপসহ)
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const resArea = document.getElementById('resArea');
    
    // ইনপুট ভ্যালু নেওয়া
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value; // UG, PG, DIPLOMA, etc.
    const fUserGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fUserIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    // লোডিং স্টেট দেখানো
    resArea.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching Universities... <i class="fas fa-spinner fa-spin"></i></td></tr>';

    // ডাটাবেজ থেকে রিয়েল-টাইম ডাটা রিড
    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let foundCount = 0;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            
            // ডাটাবেজের ফিল্ড ম্যাপিং (অ্যাডমিন প্যানেলের ভ্যারিয়েবল অনুযায়ী)
            const dbCountry = (u.country || "").toLowerCase().trim();
            const dbDegree = u.degree || u.degreeType || ""; 
            const dbGPA = parseFloat(u.minGPA || 0);
            const dbIELTS = parseFloat(u.ieltsO || u.ieltsOverall || 0);

            // ম্যাচিং কন্ডিশন (সব ফিল্টার চেক করা হচ্ছে)
            const matchCountry = !fCountry || dbCountry.includes(fCountry);
            const matchDegree = !fDegree || dbDegree === fDegree;
            const matchGPA = !fUserGPA || fUserGPA >= dbGPA;
            const matchIELTS = !fUserIELTS || fUserIELTS >= dbIELTS;

            if (matchCountry && matchDegree && matchGPA && matchIELTS) {
                foundCount++;
                
                // কমিশন ক্যালকুলেশন (Rate 120 হিসেবে)
                const semesterFee = parseFloat(u.semesterFee) || 0;
                const pCommPercent = parseFloat(u.partnerCommPercent || u.partnerComm || 0);
                const totalComm = (semesterFee * 120 * pCommPercent) / 100;

                rows += `
                <tr>
                    <td><b>${u.name || u.universityName || 'N/A'}</b></td>
                    <td>${dbDegree}</td>
                    <td>${u.course || u.courseName || 'General'}</td>
                    <td>${u.currency || '$'} ${u.semesterFee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${Math.round(totalComm).toLocaleString()}</td>
                    <td>${u.gap || u.gapAcceptance || '0'} Yrs</td>
                    <td>${dbGPA}</td>
                    <td>${dbIELTS}</td>
                    <td>${u.scholarship || '0%'}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${u.name || u.universityName}', ${totalComm})">Open File</button></td>
                </tr>`;
            }
        });

        // রেজাল্ট দেখানো
        if (foundCount > 0) {
            tbody.innerHTML = rows;
        } else {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#ff4757;">No universities found matching your criteria.</td></tr>';
        }
    });
};

// ৪. ফাইল ওপেনিং মডাল ফাংশন
window.openApp = (uniName, comm) => {
    document.getElementById('mTitle').innerText = uniName;
    document.getElementById('appModal').style.display = 'flex';
    // আপনি চাইলে এখানে কমিশন স্টোর করে রাখতে পারেন পরবর্তী সাবমিশনের জন্য
    console.log("Applying for:", uniName, "Commission:", comm);
};

// ৫. মডাল বন্ধ করা
window.closeModal = () => {
    document.getElementById('appModal').style.display = 'none';
};