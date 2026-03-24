import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const partnerEmail = (localStorage.getItem('partnerEmail') || '').toLowerCase().trim();

// ১. রিয়েলটাইম প্রোফাইল ডাটা
export function initRealtimeData() {
    if (!partnerEmail) return;
    const q = query(collection(db, "users"), where("email", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        snap.forEach(docSnap => {
            const d = docSnap.data();
            localStorage.setItem('userDocId', docSnap.id);
            if(document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = d.fullName || 'Partner';
            if(document.getElementById('topPending')) document.getElementById('topPending').innerText = `৳${(d.pendingComm || 0).toLocaleString()}`;
            if(document.getElementById('topFinal')) document.getElementById('topFinal').innerText = `৳${(d.finalBalance || 0).toLocaleString()}`;
            if(document.getElementById('withdrawFinalBalance')) document.getElementById('withdrawFinalBalance').innerText = `৳${(d.finalBalance || 0).toLocaleString()}`;
            if(document.getElementById('pAgency')) document.getElementById('pAgency').value = d.fullName || '';
            if(document.getElementById('pContact')) document.getElementById('pContact').value = d.phone || '';
        });
    });
}

// ২. ট্র্যাকিং লজিক (ইমেইল ফিল্টারসহ)
export function initTracking() {
    if (!partnerEmail) return;
    const q = collection(db, "applications");
    onSnapshot(q, (snap) => {
        let fullHtml = ""; let homeHtml = "";
        snap.forEach(docSnap => {
            const a = docSnap.data();
            const dbEmail = (a.partnerEmail || a.email || '').toString().toLowerCase().trim();
            
            if (dbEmail === partnerEmail) {
                const date = a.updatedAt?.toDate().toLocaleDateString('en-GB') || 'Pending';
                const status = (a.status || 'Pending').toUpperCase();

                fullHtml += `<tr>
                    <td><b>${a.studentName}</b><br><small>${a.university || ''}</small></td>
                    <td>${a.handledBy || 'Processing'}</td>
                    <td>${a.passportNo}</td>
                    <td style="color:#f1c40f">${status}</td>
                    <td><span style="color:#2ecc71"><i class="fas fa-check-circle"></i> Verified</span></td>
                    <td>${date}</td>
                </tr>`;
                
                homeHtml += `<tr><td>${a.studentName}</td><td>${a.passportNo}</td><td>${status}</td><td>${date}</td></tr>`;
            }
        });
        document.getElementById('fullTrackingBody').innerHTML = fullHtml || "<tr><td colspan='6'>No files found.</td></tr>";
        document.getElementById('homeTrackingBody').innerHTML = homeHtml || "<tr><td colspan='4'>No activity.</td></tr>";
    });
}

// ৩. সার্চ লজিক (৫টি ফিল্ড)
export async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    
    const container = document.getElementById('uniListContainer');
    container.innerHTML = "Searching...";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        snap.forEach(docSnap => {
            const u = docSnap.data();
            if ((!country || u.country.toLowerCase().includes(country)) && (!degree || u.degree === degree)) {
                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>${u.minGPA}</td>
                    <td>৳${(u.semesterFee * 120).toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${(u.semesterFee * 120 * u.partnerComm / 100).toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='6'>No results.</td></tr>";
    } catch (e) { container.innerHTML = "Error loading data."; }
}

// ৪. পপআপ ও সাবমিশন লজিক
let currentUni = "";
export function openApplyModal(uniName) {
    currentUni = uniName;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = "block";
}

export function closeModal() {
    document.getElementById('applyModal').style.display = "none";
}

export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    
    if(!sName || !sPass) return alert("Please fill Student Name and Passport!");

    try {
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: currentUni,
            partnerEmail: partnerEmail,
            status: "Submitted",
            updatedAt: serverTimestamp()
        });

        alert(`Application Successful!\nSlip ID: ${docRef.id}\nStudent: ${sName}\nUniversity: ${currentUni}`);
        closeModal();
    } catch (e) { alert("Submission failed!"); }
}

// ৫. প্রোফাইল ও উইথড্রয়াল
export async function updateProfile() {
    const id = localStorage.getItem('userDocId');
    await updateDoc(doc(db, "users", id), { phone: document.getElementById('pContact').value });
    alert("Profile Updated!");
}

export async function requestWithdraw() {
    const amt = document.getElementById('wdAmount').value;
    if(!amt || amt <= 0) return alert("Enter valid amount");
    await addDoc(collection(db, "withdrawals"), { 
        email: partnerEmail, amount: Number(amt), 
        method: document.getElementById('wdMethod').value, 
        status: "Pending", timestamp: serverTimestamp() 
    });
    alert("Withdrawal Requested!");
}