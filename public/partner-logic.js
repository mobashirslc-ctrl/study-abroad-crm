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

const partnerEmail = (localStorage.getItem('partnerEmail') || '').toString().trim().toLowerCase();

// ১. রিয়েলটাইম ডাটা (Profile & Balance)
export function initRealtimeData() {
    if (!partnerEmail) return;
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

// ২. ট্র্যাকিং লজিক
export function initTracking() {
    if (!partnerEmail) return;
    const q = collection(db, "applications");
    onSnapshot(q, (snap) => {
        let fullHtml = ""; let homeHtml = ""; let count = 0;
        const currentPartner = partnerEmail.toLowerCase();

        snap.forEach(docSnap => {
            const a = docSnap.data();
            const dbEmail = (a.partnerEmail || a.email || '').toString().trim().toLowerCase();
            
            if (dbEmail === currentPartner) {
                count++;
                let lastUpdate = a.updatedAt?.seconds ? new Date(a.updatedAt.seconds * 1000).toLocaleDateString('en-GB') : 'N/A';
                const statusText = (a.status || 'Processing').replace(/_/g, ' ').toUpperCase();

                fullHtml += `<tr>
                    <td><b>${a.studentName}</b><br><small>${a.university}</small></td>
                    <td>${a.handledBy || 'Admin'}</td> 
                    <td>${a.passportNo}</td>
                    <td style="color:#f1c40f; font-weight:bold;">${statusText}</td>
                    <td><span style="color:#2ecc71"><i class="fas fa-check-circle"></i> Verified</span></td>
                    <td>${lastUpdate}</td>
                </tr>`;
                homeHtml += `<tr><td><b>${a.studentName}</b></td><td>${a.passportNo}</td><td>${statusText}</td><td>${lastUpdate}</td></tr>`;
            }
        });
        
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = fullHtml || "<tr><td colspan='6'>No Data Found</td></tr>";
        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = homeHtml || "<tr><td colspan='4'>No Activity</td></tr>";
    });
}

// ৩. উইথড্রয়াল রিকোয়েস্ট
export async function requestWithdraw() {
    const amt = document.getElementById('wdAmount').value;
    if(!amt || amt <= 0) return alert("Please enter a valid amount");
    try {
        await addDoc(collection(db, "withdrawals"), { 
            email: partnerEmail, amount: Number(amt), 
            method: document.getElementById('wdMethod').value, 
            status: "Pending", timestamp: serverTimestamp() 
        });
        alert("Withdrawal Request Submitted!");
        document.getElementById('wdAmount').value = "";
    } catch (err) { alert("Request failed!"); }
}

// ৪. প্রোফাইল আপডেট
export async function updateProfile() {
    const docId = localStorage.getItem('userDocId');
    try {
        await updateDoc(doc(db, "users", docId), { phone: document.getElementById('pContact').value });
        alert("Profile Updated!");
    } catch (err) { alert("Update failed!"); }
}

// ৫. ইউনিভার্সিটি সার্চ
export async function searchUni() {
    const country = document.getElementById('fCountry').value.trim().toLowerCase();
    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='6'>Searching...</td></tr>";
    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (!country || u.country.toLowerCase().includes(country)) {
                html += `<tr><td><b>${u.universityName}</b></td><td>${u.degree}</td><td>${u.minGPA}</td><td>৳${(u.semesterFee*120).toLocaleString()}</td><td style="color:#f1c40f">৳${((u.semesterFee*120)*u.partnerComm/100).toLocaleString()}</td><td><button class="btn-gold">APPLY</button></td></tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='6'>No results</td></tr>";
    } catch (err) { container.innerHTML = "<tr><td colspan='6'>Error!</td></tr>"; }
}