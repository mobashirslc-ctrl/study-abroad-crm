import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// আপনার Firebase Config দিন
const firebaseConfig = { 
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_PROJECT.firebaseapp.com", 
    projectId: "YOUR_PROJECT", 
    storageBucket: "YOUR_PROJECT.appspot.com", 
    messagingSenderId: "YOUR_ID", 
    appId: "YOUR_APP_ID" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ৩. রিয়েল-টাইম ওয়ালেট আপডেট (সরাসরি অ্যাপ্লিকেশান কালেকশন থেকে)
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingTotal = 0;
    let availableTotal = 0;

    snap.forEach(doc => {
        const data = doc.data();
        const comm = parseFloat(data.commission || 0);
        
        if (data.status === "Pending") {
            pendingTotal += comm;
        } else if (data.status === "Approved" || data.status === "Success") {
            availableTotal += comm;
        }
    });

    document.getElementById('pendingAm').innerText = `৳ ${pendingTotal.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableTotal.toLocaleString()}`;
});

// ১. রিয়েল-টাইম ইউনিভার্সিটি সার্চ (অ্যাডমিন প্যানেলের হুবহু ফিল্ড অনুযায়ী)
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const resArea = document.getElementById('resArea');
    
    // ড্যাশবোর্ডের ইনপুট ভ্যালু
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value; 
    const fScore = parseFloat(document.getElementById('fScore').value) || 0;

    resArea.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">সার্চ করা হচ্ছে...</td></tr>';

    // অ্যাডমিন ডাটা রিয়েল-টাইম রিড করা
    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let foundCount = 0;

        snap.forEach(doc => {
            const u = doc.data();
            
            // আপনার অ্যাডমিন প্যানেলের স্ক্রিনশট অনুযায়ী ম্যাপিং
            const dbUniName = u.universityName || u.name || "N/A";
            const dbCountry = (u.country || u.Country || "").toLowerCase().trim();
            const dbDegree = u.degreeType || u.DegreeType || "";
            const dbIELTS = parseFloat(u.ieltsOverall || u.IELTSOverall || 0);
            const dbCourse = u.courseName || u.CourseName || "N/A";

            // লুজ ফিল্টারিং (যাতে ডাটা সহজে পাওয়া যায়)
            const matchCountry = !fCountry || dbCountry.includes(fCountry);
            const matchDegree = !fDegree || dbDegree === fDegree;
            const matchScore = !fScore || dbIELTS <= fScore;

            if (matchCountry && matchDegree && matchScore) {
                foundCount++;
                
                // আপনার অ্যাডমিনের Exchange Rate (১২০) এবং কমিশন % অনুযায়ী হিসাব
                const semesterFee = parseFloat(u.semesterFee) || 0;
                const commPercent = parseFloat(u.partnerComm) || 0;
                const totalComm = (semesterFee * 120 * commPercent) / 100;

                rows += `
                <tr>
                    <td>${dbUniName}</td>
                    <td>${dbDegree}</td>
                    <td>${dbCourse}</td>
                    <td>${u.currency || 'USD'} ${u.semesterFee || 0}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${Math.round(totalComm).toLocaleString()}</td>
                    <td>${u.gapAcceptance || '0'} Yrs</td>
                    <td>-</td> 
                    <td>${dbIELTS}</td>
                    <td>${u.scholarship || '0%'}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; width:auto;" onclick="openApp('${dbUniName}', ${totalComm})">Open File</button></td>
                </tr>`;
            }
        });

        if (foundCount > 0) {
            tbody.innerHTML = rows;
        } else {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">অ্যাডমিন প্যানেলে ডাটা থাকলেও ফিল্টারের সাথে মিলছে না।</td></tr>';
        }
    });
};

// ২. ফাইল সাবমিশন এবং ট্র্যাকিং (আগের মতোই)
// ... (বাকি কোড অপরিবর্তিত রাখুন)