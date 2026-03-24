import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// লগইন করা ইমেইল (স্পেস থাকলে ট্রিম করে নিবে)
const partnerEmail = (localStorage.getItem('partnerEmail') || 'gorunbangladesh@gmail.com').trim();

// ১. রিয়েল-টাইম প্রোফাইল এবং ব্যালেন্স ডাটা
export function initRealtimeData() {
    const q = query(collection(db, "users"), where("email", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        snap.forEach(docSnap => {
            const data = docSnap.data();
            localStorage.setItem('userDocId', docSnap.id);
            if(document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = data.fullName || 'Partner';
            if(document.getElementById('topPending')) document.getElementById('topPending').innerText = `৳${(data.pendingComm || 0).toLocaleString()}`;
            if(document.getElementById('topFinal')) document.getElementById('topFinal').innerText = `৳${(data.finalBalance || 0).toLocaleString()}`;
            if(document.getElementById('withdrawFinalBalance')) document.getElementById('withdrawFinalBalance').innerText = (data.finalBalance || 0).toLocaleString();
            if(document.getElementById('pAgency')) document.getElementById('pAgency').value = data.fullName || '';
            if(document.getElementById('pContact')) document.getElementById('pContact').value = data.phone || '';
        });
    });
}

// ২. ট্র্যাকিং লজিক (আপনার ডাটাবেস স্ক্রিনশট অনুযায়ী ফিক্সড)
export function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    
    onSnapshot(q, (snap) => {
        let fullHtml = ""; 
        let homeHtml = "";
        
        console.log("Apps Found:", snap.size); 

        snap.forEach(docSnap => {
            const a = docSnap.data();
            
            let lastUpdate = 'N/A';
            if (a.updatedAt && a.updatedAt.seconds) {
                lastUpdate = new Date(a.updatedAt.seconds * 1000).toLocaleDateString('en-GB');
            }

            fullHtml += `
                <tr>
                    <td><b>${a.studentName || 'N/A'}</b><br><small>${a.university || ''}</small></td>
                    <td>${a.handledBy || 'Admin'}</td> 
                    <td>${a.passportNo || 'N/A'}</td>
                    <td style="color:#f1c40f; font-weight:bold;">${a.status || 'Pending'}</td>
                    <td>Verified</td>
                    <td style="font-size:11px;">${lastUpdate}</td>
                </tr>`;

            homeHtml += `<tr><td><b>${a.studentName}</b></td><td>${a.passportNo || 'N/A'}</td><td>${a.status}</td><td>${lastUpdate}</td></tr>`;
        });
        
        const fullBody = document.getElementById('fullTrackingBody');
        const homeBody = document.getElementById('homeTrackingBody');
        
        if(fullBody) fullBody.innerHTML = fullHtml || "<tr><td colspan='6' style='text-align:center'>No Data Found</td></tr>";
        if(homeBody) homeBody.innerHTML = homeHtml || "<tr><td colspan='4' style='text-align:center'>No Activity</td></tr>";
    });
}

// ৩. অ্যাসেসমেন্ট বা ইউনিভার্সিটি সার্চ লজিক
export async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const container = document.getElementById('uniListContainer');
    
    document.getElementById('searchResultArea').style.display = "block";
    container.innerHTML = "Searching...";

    const BDT_RATE = 120;
    const snap = await getDocs(collection(db, "universities"));
    let html = "";
    
    snap.forEach(docSnap => {
        const u = docSnap.data();
        if ((!country || u.country.toLowerCase().includes(country)) && (!degree || u.degree === degree)) {
            const feesBDT = (u.semesterFee || 0) * BDT_RATE;
            const commBDT = (feesBDT * (u.partnerComm || 0)) / 100;
            html += `<tr>
                <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                <td>${u.degree}</td>
                <td>GPA: ${u.minGPA}</td>
                <td>৳${feesBDT.toLocaleString()}</td>
                <td style="color:#f1c40f">৳${commBDT.toLocaleString()}</td>
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;">APPLY</button></td>
            </tr>`;
        }
    });
    container.innerHTML = html || "<tr><td colspan='6'>No Matches Found</td></tr>";
}

// ৪. উইথড্রয়াল রিকোয়েস্ট
export async function requestWithdraw() {
    const amt = document.getElementById('wdAmount').value;
    if(!amt || amt <= 0) return alert("Enter valid amount");
    await addDoc(collection(db, "withdrawals"), { 
        email: partnerEmail, 
        amount: Number(amt), 
        method: document.getElementById('wdMethod').value, 
        status: "Pending", 
        timestamp: serverTimestamp() 
    });
    alert("Withdrawal Request Submitted!");
}

// ৫. প্রোফাইল আপডেট
export async function updateProfile() {
    const docId = localStorage.getItem('userDocId');
    const newPhone = document.getElementById('pContact').value;
    if(!docId) return alert("Error updating profile");
    await updateDoc(doc(db, "users", docId), { phone: newPhone });
    alert("Profile Updated!");
}