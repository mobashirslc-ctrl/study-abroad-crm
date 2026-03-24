import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ১. ফায়ারবেস কনফিগ
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

// ২. সেকিউরিটি গার্ড ও ইমেইল রিড
const partnerEmail = (localStorage.getItem('partnerEmail') || '').trim().toLowerCase();

if (!partnerEmail) {
    console.error("DEBUG: No partner email found in localStorage. Redirecting...");
    window.location.replace("index.html");
} else {
    console.log("DEBUG: Logged in as:", partnerEmail);
}

// ৩. প্রোফাইল ও ব্যালেন্স লোড করা
export function initRealtimeData() {
    if (!partnerEmail) return;

    const q = query(collection(db, "users"), where("email", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        if (snap.empty) console.warn("DEBUG: No user profile found for email:", partnerEmail);
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            console.log("DEBUG: Profile Data Loaded:", data.fullName);
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

// ৪. ট্র্যাকিং লজিক (সংশোধিত ও ডিবাগ লগ সহ)
export function initTracking() {
    if (!partnerEmail) return;

    const q = collection(db, "applications");
    
    onSnapshot(q, (snap) => {
        let fullHtml = ""; 
        let homeHtml = "";
        let count = 0;

        console.log("DEBUG: Total apps in DB:", snap.size);

        snap.forEach(docSnap => {
            const a = docSnap.data();
            
            // ডাটাবেসের ইমেইল ফিল্ডটি ছোট হাতের করে চেক করা হচ্ছে
            const dbEmail = (a.partnerEmail || a.email || '').trim().toLowerCase();
            
            if (dbEmail === partnerEmail) {
                count++;
                let lastUpdate = 'N/A';
                if (a.updatedAt && a.updatedAt.seconds) {
                    lastUpdate = new Date(a.updatedAt.seconds * 1000).toLocaleDateString('en-GB');
                }

                fullHtml += `
                    <tr>
                        <td><b>${a.studentName || 'N/A'}</b><br><small>${a.university || 'N/A'}</small></td>
                        <td>${a.handledBy || 'Admin'}</td> 
                        <td>${a.passportNo || 'N/A'}</td>
                        <td style="color:#f1c40f; font-weight:bold;">${a.status || 'Processing'}</td>
                        <td><span style="color:#2ecc71"><i class="fas fa-check-circle"></i> Verified</span></td>
                        <td style="font-size:11px;">${lastUpdate}</td>
                    </tr>`;

                homeHtml += `<tr><td><b>${a.studentName}</b></td><td>${a.passportNo || 'N/A'}</td><td>${a.status}</td><td>${lastUpdate}</td></tr>`;
            }
        });
        
        console.log("DEBUG: Matches found for this partner:", count);

        const fullBody = document.getElementById('fullTrackingBody');
        const homeBody = document.getElementById('homeTrackingBody');
        
        if(fullBody) fullBody.innerHTML = fullHtml || "<tr><td colspan='6' style='text-align:center'>No Data Found for " + partnerEmail + "</td></tr>";
        if(homeBody) homeBody.innerHTML = homeHtml || "<tr><td colspan='4' style='text-align:center'>No Activity</td></tr>";
    });
}

// ৫. ইউনিভার্সিটি সার্চ
export async function searchUni() {
    const country = document.getElementById('fCountry').value.trim().toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const container = document.getElementById('uniListContainer');
    
    if(document.getElementById('searchResultArea')) document.getElementById('searchResultArea').style.display = "block";
    container.innerHTML = "<tr><td colspan='6' style='text-align:center'>Searching...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const uCountry = (u.country || '').toLowerCase();
            if ((!country || uCountry.includes(country)) && (!degree || u.degree === degree)) {
                const feesBDT = (u.semesterFee || 0) * 120;
                const commBDT = (feesBDT * (u.partnerComm || 0)) / 100;
                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>GPA: ${u.minGPA || '2.50'}</td>
                    <td>৳${feesBDT.toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${commBDT.toLocaleString()}</td>
                    <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='6' style='text-align:center'>No universities found</td></tr>";
    } catch (err) { 
        console.error("DEBUG: Search Error:", err);
        container.innerHTML = "<tr><td colspan='6'>Error loading data!</td></tr>"; 
    }
}

// ৬. উইথড্রয়াল রিকোয়েস্ট
export async function requestWithdraw() {
    const amt = document.getElementById('wdAmount').value;
    if(!amt || amt <= 0) return alert("Please enter a valid amount");
    
    try {
        await addDoc(collection(db, "withdrawals"), { 
            email: partnerEmail, 
            amount: Number(amt), 
            method: document.getElementById('wdMethod').value, 
            status: "Pending", 
            timestamp: serverTimestamp() 
        });
        alert("Withdrawal Request Submitted!");
        document.getElementById('wdAmount').value = "";
    } catch (err) {
        console.error("DEBUG: Withdraw Error:", err);
        alert("Request failed!");
    }
}

// ৭. প্রোফাইল আপডেট
export async function updateProfile() {
    const docId = localStorage.getItem('userDocId');
    if(!docId) return alert("Session expired, please login again.");
    
    try {
        await updateDoc(doc(db, "users", docId), { phone: document.getElementById('pContact').value });
        alert("Profile Updated!");
    } catch (err) {
        console.error("DEBUG: Update Error:", err);
        alert("Update failed!");
    }
}