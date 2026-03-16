import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const BDT_RATE = 155;

// ১. পার্টনার লগইন লক ও নাম প্রদর্শন
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // রিয়েল পার্টনার নাম আনা (যদি partners কালেকশনে থাকে)
        const pRef = doc(db, "partners", user.uid);
        const pSnap = await getDoc(pRef);
        document.getElementById('pNameText').innerText = pSnap.exists() ? pSnap.data().fullName : user.email.split('@')[0];
        
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        
        startLiveTracking(user.email); // ট্র্যাকিং চালু
    } else {
        window.location.replace("index.html");
    }
});

// ২. অ্যাডমিন থেকে রিয়েল-টাইম ডাটা সার্চ
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.trim();
    const resultsBody = document.getElementById('uniResultsBody');
    
    if(!country) return alert("Enter Country!");
    
    document.getElementById('resArea').style.display = 'block';
    resultsBody.innerHTML = "Searching admin records...";

    try {
        const q = query(collection(db, "universities"), where("country", "==", country));
        const snap = await getDocs(q);
        resultsBody.innerHTML = "";

        snap.forEach(doc => {
            const uni = doc.data();
            const tuition = parseFloat(uni.tuitionFee || 0);
            const comm = (tuition * BDT_RATE * (parseFloat(uni.partnerCommPercentage) || 0)) / 100;

            resultsBody.innerHTML += `
                <tr>
                    <td><b>${uni.universityName}</b></td>
                    <td>${uni.country}</td>
                    <td>${uni.degree}</td>
                    <td>${uni.intake}</td>
                    <td>${uni.currency}${tuition}</td>
                    <td style="color:var(--gold)">৳ ${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="window.openApply('${uni.universityName}')">Apply</button></td>
                </tr>`;
        });
    } catch(e) { resultsBody.innerHTML = "Error loading data."; }
};

// ৩. লাইভ ট্র্যাকিং (সব নতুন কলাম সহ)
function startLiveTracking(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('fullTrackingBody');
        tbody.innerHTML = "";
        
        snap.forEach(doc => {
            const app = doc.data();
            const date = app.submittedAt ? app.submittedAt.toDate().toLocaleString() : 'Processing...';
            
            tbody.innerHTML += `
                <tr>
                    <td>${app.studentName || 'N/A'}</td>
                    <td>${app.studentContact || 'No Contact'}</td>
                    <td>${app.passportNo || 'N/A'}</td>
                    <td>${app.university || 'N/A'}</td>
                    <td><span style="background:rgba(255,204,0,0.1); color:var(--gold); padding:4px 8px; border-radius:5px;">${app.status || 'Pending'}</span></td>
                    <td>${app.complianceMember || 'Assigning...'}</td>
                    <td>
                        <a href="${app.docs?.passport}" target="_blank" style="color:var(--gold)"><i class="fa-solid fa-file-pdf"></i></a>
                    </td>
                    <td style="font-size:10px;">${date}</td>
                </tr>`;
        });
    });
}