import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// আপনার Firebase Config (এগুলো আপনার প্রজেক্ট অনুযায়ী পরিবর্তন করুন)
const firebaseConfig = { 
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com", 
    projectId: "YOUR_PROJECT_ID", 
    storageBucket: "YOUR_PROJECT_ID.appspot.com", 
    messagingSenderId: "YOUR_SENDER_ID", 
    appId: "YOUR_APP_ID" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let curUni = "";
let selectedUniCommission = 0;

// ১. রিয়েল-টাইম ওয়ালেট আপডেট (অটো ক্যালকুলেশন)
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingTotal = 0;
    let availableTotal = 0;

    snap.forEach(doc => {
        const data = doc.data();
        // অ্যাডমিন প্যানেল থেকে কমিশন এবং স্ট্যাটাস অনুযায়ী হিসাব
        const comm = parseFloat(data.commission || 0);
        
        if (data.status === "Pending") {
            pendingTotal += comm;
        } else if (data.status === "Approved" || data.status === "Success") {
            availableTotal += comm;
        }
    });

    // ড্যাশবোর্ডের এইচটিএমএল আইডিতে ডাটা বসানো
    const pendingEl = document.getElementById('pendingAm');
    const availEl = document.getElementById('availAm');
    
    if(pendingEl) pendingEl.innerText = `৳ ${pendingTotal.toLocaleString()}`;
    if(availEl) availEl.innerText = `৳ ${availableTotal.toLocaleString()}`;
});

// ২. ইউনিভার্সিটি সার্চ এবং রিয়েল-টাইম ডাটা শো (অ্যাডমিন ফিল্ড ম্যাচিং)
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const resArea = document.getElementById('resArea');
    
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value; 
    const fScore = parseFloat(document.getElementById('fScore').value) || 0;

    resArea.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">অ্যাডমিন ডাটা চেক করা হচ্ছে...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let foundCount = 0;

        snap.forEach(doc => {
            const u = doc.data();
            
            // আপনার অ্যাডমিন প্যানেলের স্ক্রিনশট অনুযায়ী ফিল্ড ম্যাপিং
            const dbCountry = (u.country || u.Country || "").toLowerCase();
            const dbDegree = u.degreeType || u.DegreeType || "";
            const dbIELTS = parseFloat(u.ieltsOverall || u.IELTSOverall || 0);
            const dbUniName = u.universityName || u.name || "N/A";

            // ফিল্টার কন্ডিশন
            const matchCountry = !fCountry || dbCountry.includes(fCountry);
            const matchDegree = !fDegree || dbDegree === fDegree;
            const matchScore = !fScore || dbIELTS <= fScore;

            if (matchCountry && matchDegree && matchScore) {
                foundCount++;
                
                // কমিশন হিসাব (সেমিস্টার ফি * এক্সচেঞ্জ রেট * কমিশন %)
                const semesterFee = parseFloat(u.semesterFee) || 0;
                const commPercent = parseFloat(u.partnerComm) || 0;
                const totalComm = (semesterFee * 120 * commPercent) / 100; // ১২০ টাকা রেট ধরে

                rows += `
                <tr>
                    <td>${dbUniName}</td>
                    <td>${dbDegree}</td>
                    <td>${u.courseName || u.subject || 'N/A'}</td>
                    <td>${u.currency || '$'} ${u.semesterFee}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${Math.round(totalComm).toLocaleString()}</td>
                    <td>${u.gapAcceptance || u.gapAllowed || '0'} Yrs</td>
                    <td>Min GPA</td>
                    <td>${dbIELTS}</td>
                    <td>${u.scholarship || '0%'}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; width:auto;" onclick="openApp('${dbUniName}', ${totalComm})">Open File</button></td>
                </tr>`;
            }
        });

        tbody.innerHTML = foundCount > 0 ? rows : '<tr><td colspan="11" style="text-align:center; color:red;">অ্যাডমিন প্যানেলে কোনো ডাটা পাওয়া যায়নি।</td></tr>';
    });
};

// ৩. ফাইল ওপেন এবং সাবমিট লজিক
window.openApp = (u, comm) => { 
    curUni = u; 
    selectedUniCommission = comm;
    document.getElementById('mTitle').innerText = u; 
    document.getElementById('appModal').style.display = 'flex'; 
};

document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value.trim();
    const pass = document.getElementById('sPass').value.trim();
    const btn = document.getElementById('submitBtn');

    if(!name || !pass) return alert("Student Name এবং Passport Number দিন!");

    try {
        btn.innerText = "Processing...";
        btn.disabled = true;

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            passport: pass,
            university: curUni,
            commission: selectedUniCommission,
            status: "Pending",
            partner: "GORUN LTD.",
            timestamp: serverTimestamp()
        });

        // স্লিপ আপডেট
        document.getElementById('slipNameDisp').innerText = name;
        document.getElementById('slipPassDisp').innerText = pass;
        document.getElementById('slipUniDisp').innerText = curUni;
        document.getElementById('slipDateDisp').innerText = new Date().toLocaleDateString('en-GB');
        document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${docRef.id}`;

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
        
    } catch (e) { alert("Error: " + e.message); }
    finally {
        btn.innerText = "Submit to Admin";
        btn.disabled = false;
    }
};

// ৪. লাইভ ফাইল ট্র্যাকিং টেবিল
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = ""; 
    snap.forEach(doc => { 
        const d = doc.data(); 
        const date = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : 'Just now';
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${date}</td></tr>`; 
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});