import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const userEmail = localStorage.getItem('userEmail');
const userId = localStorage.getItem('userId');

function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        let current = 0, success = 0, reject = 0, totalEarned = 0, pendingEarn = 0, finalEarn = 0;
        
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const comm = d.commission || 0;

            if(d.status === 'pending' || d.status === 'processing') {
                current++;
                pendingEarn += comm;
            } else if(d.status === 'approved' || d.status === 'visa-received') {
                success++;
                finalEarn += comm;
                totalEarned += comm;
            } else if(d.status === 'rejected') {
                reject++;
            }

            const dateStr = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString() : '...';
            tbody.innerHTML += `<tr>
                <td>${d.studentName}</td>
                <td>${d.contactNo || 'N/A'}</td>
                <td>${d.passportNo}</td>
                <td style="color:var(--gold)">${d.status.toUpperCase()}</td>
                <td>${d.complianceStaff || 'Waiting'}</td>
                <td><a href="${d.docs?.pdfAcademic || '#'}" target="_blank">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        // Update Top Fixed Wallet
        document.getElementById('topPending').innerText = `৳ ${pendingEarn.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳ ${finalEarn.toLocaleString()}`;

        // Update Summary Stats
        document.getElementById('statCurrent').innerText = current;
        document.getElementById('statSuccess').innerText = success;
        document.getElementById('statEarn').innerText = `৳ ${totalEarned.toLocaleString()}`;
        document.getElementById('statReject').innerText = reject;
        
        if(finalEarn > 0) document.getElementById('withdrawBtn').disabled = false;
    });
}

// Re-init assessment filter & profile functions here (rest of logic same as before)
// ...
initTracking();
