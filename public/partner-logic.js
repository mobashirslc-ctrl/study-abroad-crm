import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// আপনার Firebase Config (নিশ্চিত করুন এগুলো সঠিক আছে)
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

// ১. রিয়েল-টাইম ইউনিভার্সিটি কানেকশন (অ্যাডমিন ডাটা শো করা)
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const resArea = document.getElementById('resArea');
    
    // ইউজার ইনপুট ভ্যালু
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value;
    const fAcad = parseFloat(document.getElementById('fAcad').value) || 0;
    const fScore = parseFloat(document.getElementById('fScore').value) || 0;

    resArea.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">অ্যাডমিন ডাটা চেক করা হচ্ছে...</td></tr>';

    // অ্যাডমিন প্যানেলের 'universities' কালেকশন থেকে রিয়েল-টাইম ডাটা আনা
    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let foundCount = 0;

        snap.forEach(doc => {
            const u = doc.data();
            
            // স্মার্ট ফিল্টারিং কন্ডিশন
            const matchCountry = !fCountry || (u.country && u.country.toLowerCase().includes(fCountry));
            const matchDegree = !fDegree || (u.degree === fDegree);
            // অ্যাডমিন প্যানেলে যদি minGPA এবং langScore ফিল্ড থাকে তবেই ফিল্টার করবে
            const matchGPA = !fAcad || (parseFloat(u.minGPA) || 0) <= fAcad;
            const matchScore = !fScore || (parseFloat(u.langScore) || 0) <= fScore;

            if (matchCountry && matchDegree && matchGPA && matchScore) {
                foundCount++;
                rows += `
                <tr>
                    <td>${u.name || 'N/A'}</td>
                    <td>${u.degree || 'N/A'}</td>
                    <td>${u.subject || 'N/A'}</td>
                    <td>${u.currency || '$'} ${u.semesterFee || 0}</td>
                    <td style="color:#00ff00; font-weight:bold;">৳ ${Math.round(u.commission || 0).toLocaleString()}</td>
                    <td>${u.gapAllowed || 'N/A'}</td>
                    <td>${u.minGPA || 'N/A'}</td>
                    <td>${u.langScore || 'N/A'}</td>
                    <td>${u.scholarship || 'N/A'}</td>
                    <td>${u.intake || 'N/A'}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; width:auto;" onclick="openApp('${u.name}', ${u.commission || 0})">Open File</button></td>
                </tr>`;
            }
        });

        if (foundCount > 0) {
            tbody.innerHTML = rows;
        } else {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">দুঃখিত! অ্যাডমিন প্যানেলে আপনার সার্চের সাথে মিলে এমন কোনো ইউনিভার্সিটি পাওয়া যায়নি।</td></tr>';
        }
    });
};

// ২. ফাইল ওপেন পপআপ
window.openApp = (u, comm) => { 
    curUni = u; 
    selectedUniCommission = comm;
    document.getElementById('mTitle').innerText = u; 
    document.getElementById('appModal').style.display = 'flex'; 
};

// ৩. ফাইল সাবমিট এবং স্লিপ জেনারেশন (অ্যাক্টিভ বাটন)
document.getElementById('submitBtn').onclick = async () => {
    const name = document.getElementById('sName').value.trim();
    const pass = document.getElementById('sPass').value.trim();
    const btn = document.getElementById('submitBtn');

    if(!name || !pass) return alert("Student Name এবং Passport Number দিন!");

    try {
        btn.innerText = "প্রসেসিং...";
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
        
        // QR Code জেনারেট (Tracking ID সহ)
        const qrData = `STUDENT:${name}|PASS:${pass}|ID:${docRef.id}`;
        document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

        document.getElementById('appModal').style.display = 'none';
        document.getElementById('slipOverlay').style.display = 'flex';
        
    } catch (e) { 
        alert("ভুল হয়েছে: " + e.message); 
    } finally {
        btn.innerText = "Submit to Admin";
        btn.disabled = false;
    }
};

// ৪. লাইভ ট্র্যাকিং লিস্ট (রিয়েল-টাইম আপডেট)
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = ""; 
    snap.forEach(doc => { 
        const d = doc.data(); 
        const date = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : 'Just now';
        r += `<tr><td>${d.studentName}</td><td>${d.passport}</td><td>${d.university}</td><td><b style="color:orange">${d.status}</b></td><td>${date}</td></tr>`; 
    });
    document.querySelectorAll('.sharedBody').forEach(t => t.innerHTML = r);
});