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
            
            // --- অ্যাডমিন প্যানেলের স্ক্রিনশট অনুযায়ী সম্ভাব্য সব ফিল্ড ম্যাপ করা হলো ---
            const uniName = u.universityName || u["University Name"] || u.University || "N/A Name";
            const country = u.country || u["Country"] || "N/A Country";
            const degree = u.degreeType || u["Degree Type"] || u.degree || "N/A";
            const course = u.courseName || u["Course Name"] || u.Subject || "General";
            
            // ফি এবং কমিশন পার্সেন্টেজ ফিক্স
            const fee = parseFloat(u.semesterFee || u["Semester Fee (Num)"] || u.Fee || 0);
            const pCommPercent = parseFloat(u.partnerComm || u["Partner Comm (%)"] || u.Comm || 0);
            
            // স্কলারশিপ এবং ইন্টেক
            const scholarship = u.scholarship || u["Scholarship"] || "0%";
            const intake = u.intake || u["Intake"] || "N/A";

            // রিকোয়ারমেন্টস
            const minGPA = parseFloat(u.minGPA || u["Min. Academic GPA"] || u["Gap Acceptance"] || 0);
            const minIELTS = parseFloat(u.ieltsO || u["IELTS Overall"] || 0);

            // ম্যাচিং লজিক
            if ((!fCountry || country.toLowerCase().includes(fCountry)) && 
                (!fDegree || degree === fDegree) && 
                (fGPA >= minGPA) && (fIELTS >= minIELTS)) {
                
                // ক্যালকুলেশন: ফি * ১২০ (রেট) * কমিশন %
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
                    <td>${scholarship}</td>
                    <td>${intake}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${uniName}', ${commCalculated})">OPEN FILE</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="10" style="text-align:center;">No match found. Please check Admin Data.</td></tr>';
    });
};

// --- ওয়ালেট ব্যালেন্স ফিক্স (Status: Success হলেই কেবল অ্যাড হবে) ---
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingBalance = 0;
    let availableBalance = 0;
    
    snap.forEach(doc => {
        const d = doc.data();
        const amt = parseFloat(d.commission) || 0;
        const status = (d.status || "").toLowerCase();

        if (status === "success" || status === "approved") {
            availableBalance += amt;
        } else {
            pendingBalance += amt;
        }
    });

    document.getElementById('pendingAm').innerText = `৳ ${pendingBalance.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableBalance.toLocaleString()}`;
});

// অন্যান্য ট্র্যাকিং ফাংশন আগের মতই থাকবে...
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const uniName = document.getElementById('mTitle').innerText;

    if (!sName || !sPass) return alert("তথ্য দিন!");

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: uniName,
            commission: currentComm,
            status: "Pending",
            timestamp: serverTimestamp()
        });
        alert("Submitted!");
        location.reload();
    } catch (e) { alert("Error: " + e.message); }
};