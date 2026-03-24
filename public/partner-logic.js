import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const partnerEmail = localStorage.getItem('partnerEmail')?.toLowerCase();

// ১. রিয়েলটাইম প্রোফাইল ডাটা
export function initRealtimeData() {
    if (!partnerEmail) return;
    const q = query(collection(db, "users"), where("email", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        snap.forEach(docSnap => {
            const d = docSnap.data();
            document.getElementById('welcomeName').innerText = d.fullName;
            document.getElementById('topPending').innerText = `৳${(d.pendingComm || 0).toLocaleString()}`;
            document.getElementById('topFinal').innerText = `৳${(d.finalBalance || 0).toLocaleString()}`;
            document.getElementById('withdrawFinalBalance').innerText = `৳${(d.finalBalance || 0).toLocaleString()}`;
        });
    });
}

// ২. ট্র্যাকিং লজিক
export function initTracking() {
    onSnapshot(collection(db, "applications"), (snap) => {
        let full = ""; let home = "";
        snap.forEach(docSnap => {
            const a = docSnap.data();
            if(a.partnerEmail?.toLowerCase() === partnerEmail) {
                const row = `<tr><td><b>${a.studentName}</b><br>${a.university || ''}</td><td>${a.handledBy || 'Admin'}</td><td>${a.passportNo}</td><td style="color:#f1c40f">${a.status}</td><td>Verified</td><td>${a.updatedAt?.toDate().toLocaleDateString() || 'Pending'}</td></tr>`;
                full += row;
                home += `<tr><td>${a.studentName}</td><td>${a.passportNo}</td><td>${a.status}</td><td>Just Now</td></tr>`;
            }
        });
        document.getElementById('fullTrackingBody').innerHTML = full;
        document.getElementById('homeTrackingBody').innerHTML = home;
    });
}

// ৩. সার্চ লজিক (৫ ফিল্ড)
export async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const degree = document.getElementById('fDegree').value;
    const snap = await getDocs(collection(db, "universities"));
    let html = "";
    snap.forEach(docSnap => {
        const u = docSnap.data();
        if((!country || u.country.toLowerCase().includes(country)) && (!degree || u.degree === degree)) {
            html += `<tr><td>${u.universityName}</td><td>${u.degree}</td><td>${u.minGPA}</td><td>৳${(u.semesterFee*120).toLocaleString()}</td><td>৳${(u.semesterFee*120*u.partnerComm/100).toLocaleString()}</td><td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">APPLY</button></td></tr>`;
        }
    });
    document.getElementById('uniListContainer').innerHTML = html;
}

// ৪. পপআপ ও সাবমিশন
let currentUni = "";
export function openApplyModal(uniName) {
    currentUni = uniName;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = "block";
}

export function closeModal() { document.getElementById('applyModal').style.display = "none"; }

export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Fill all fields");

    const appData = {
        studentName: sName,
        passportNo: sPass,
        university: currentUni,
        partnerEmail: partnerEmail,
        status: "Submitted",
        updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "applications"), appData);
    alert(`Success! Slip ID: ${docRef.id}\nStudent: ${sName}\nUniversity: ${currentUni}`);
    closeModal();
}