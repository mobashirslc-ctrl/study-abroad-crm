import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
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

// --- ১. স্মার্ট অ্যাসেসমেন্ট সার্চ (অ্যাডমিন ডাটাবেজ কানেকশন) ---
window.runSearch = async () => {
    const fCountry = document.getElementById('fCountry').value.trim().toLowerCase();
    const fDegree = document.getElementById('fDegree').value;
    const fGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    const tbody = document.getElementById('uniResultsBody');
    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching SCC Database...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "universities"));
        let rows = "";

        querySnapshot.forEach(doc => {
            const u = doc.data();
            
            // অ্যাডমিন প্যানেলের স্ক্রিনশট অনুযায়ী ফিল্ড ম্যাপিং (ব্রুট-ফোর্স)
            const uniName = u["University Name"] || u.universityName || u.uniName || "N/A Name";
            const country = (u["Country"] || u.country || "N/A Country");
            const degree = u["Degree Type"] || u.degreeType || u.degree || "UG";
            const course = u["Course Name"] || u.courseName || u.course || "General";
            
            // ফি এবং কমিশন পার্সেন্টেজ ফিক্স (নতুন % বক্স সহ)
            const fee = parseFloat(u["Semester Fee (Num)"] || u.semesterFee || u.fee || 0);
            const pCommPercent = parseFloat(u["Partner Comm (%)"] || u.partnerComm || u.commission || 0);
            
            // রিকোয়ারমেন্টস
            const minGPA = parseFloat(u["Min. Academic GPA"] || u.minGPA || u.gpaReq || 0);
            const minIELTS = parseFloat(u["IELTS Overall"] || u.ieltsO || 0);

            // সার্চ ফিল্টার লজিক
            const countryMatch = !fCountry || country.toLowerCase().includes(fCountry);
            const degreeMatch = !fDegree || degree === fDegree;
            const gpaMatch = fGPA >= minGPA;
            const ieltsMatch = fIELTS >= minIELTS;

            if (countryMatch && degreeMatch && gpaMatch && ieltsMatch) {
                // কমিশন ক্যালকুলেশন: ফি * ১২০ (রেট) * কমিশন %
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
                    <td>${u.scholarship || "0%"}</td>
                    <td>${u.intake || "Jan/Sept"}</td>
                    <td><button class="btn-gold" style="padding:5px 10px;" onclick="openApp('${uniName}', ${commCalculated})">OPEN FILE</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = rows || '<tr><td colspan="11" style="text-align:center; color:red;">No match found. Please check Admin Data.</td></tr>';
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Error: ' + e.message + '</td></tr>';
    }
};

// --- ২. ওয়ালেট ব্যালেন্স ফিক্স (Real-time) ---
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

// --- ৩. অ্যাপ্লিকেশন মডাল ওপেন ---
window.openApp = (uni, comm) => {
    document.getElementById('mTitle').innerText = uni;
    currentComm = comm; // ক্যালকুলেটেড কমিশন এখানে সেভ হবে
    document.getElementById('appModal').style.display = 'flex';
};

// --- ৪. অ্যাপ্লিকেশন সাবমিট ---
document.getElementById('submitBtn').onclick = async () => {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const uniName = document.getElementById('mTitle').innerText;

    if (!sName || !sPass) return alert("সবগুলো তথ্য প্রদান করুন!");

    document.getElementById('submitBtn').innerText = "Submitting...";
    document.getElementById('submitBtn').disabled = true;

    try {
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: uniName,
            commission: currentComm, // এই কমিশনটিই ওয়ালেটে যাবে
            status: "Pending",
            timestamp: serverTimestamp()
        });
        
        alert("Success! Application Sent to Admin.");
        location.reload();
    } catch (e) { 
        alert("Error: " + e.message); 
    } finally {
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').innerText = "Submit to Admin";
    }
};

// --- ৫. ফাইল ট্র্যাকিং লিস্ট (রিয়েল টাইম) ---
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'New';
        html += `<tr>
            <td>${d.studentName}</td>
            <td>${d.passport}</td>
            <td>${d.university}</td>
            <td><b style="color:orange">${d.status}</b></td>
            <td>${date}</td>
        </tr>`;
    });
    const trackingBodies = document.querySelectorAll('.sharedBody, #liveTrackingBody');
    trackingBodies.forEach(el => { if(el) el.innerHTML = html; });
});