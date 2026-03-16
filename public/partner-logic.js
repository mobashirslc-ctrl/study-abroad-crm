import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase Config (Keep the same as before)
const firebaseConfig = { /* ... your config ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentPartnerEmail = "";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("index.html");
    } else {
        currentPartnerEmail = user.email;
        document.body.classList.add('auth-ready');
        document.getElementById('loader').style.display = 'none';
        
        // Load Partner Name
        const partnerDoc = await getDoc(doc(db, "partners", user.email));
        document.getElementById('partnerNameDisplay').innerText = partnerDoc.exists() ? partnerDoc.data().agencyName : user.email;
        
        loadAppData();
    }
});

// 1. Withdraw Button Logic
function loadAppData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", currentPartnerEmail));
    
    onSnapshot(q, (snap) => {
        let fullRows = "";
        let dashboardRows = "";
        let finalWallet = 0;

        snap.forEach(doc => {
            const data = doc.data();
            finalWallet += parseFloat(data.finalAmount || 0);

            // Row for Full Tracking
            fullRows += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.contactNo || 'N/A'}</td>
                    <td>${data.passportNumber}</td>
                    <td><b>${data.status}</b><br><small>${data.complianceNote || ''}</small></td>
                    <td>${data.compliancePerson || 'Pending'}</td>
                    <td><a href="${data.docUrl || '#'}" target="_blank" style="color:var(--gold)">View</a></td>
                    <td>${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : ''}</td>
                </tr>
            `;

            // Row for Dashboard (Recent 5)
            dashboardRows += `<tr><td>${data.studentName}</td><td>${data.university}</td><td>${data.status}</td><td>Just Now</td></tr>`;
        });

        document.getElementById('fullTrackingBody').innerHTML = fullRows;
        document.getElementById('homeLiveBody').innerHTML = dashboardRows;
        document.getElementById('availAm').innerText = `৳ ${finalWallet.toLocaleString()}`;

        // Withdraw Condition Check
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (finalWallet > 0) {
            withdrawBtn.disabled = false;
        } else {
            withdrawBtn.disabled = true;
        }
    });
}

// 2. Profile Setup Save
document.getElementById('saveProfileBtn').onclick = async () => {
    const agency = document.getElementById('profAgency').value;
    const phone = document.getElementById('profPhone').value;
    const address = document.getElementById('profAddress').value;

    await setDoc(doc(db, "partners", currentPartnerEmail), {
        agencyName: agency,
        phone: phone,
        address: address
    }, { merge: true });

    alert("Profile Updated!");
    location.reload();
};

// Logout
document.getElementById('logoutBtn').onclick = () => signOut(auth);