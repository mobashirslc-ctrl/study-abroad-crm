import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

let currentPartnerEmail = "";

// --- Auth Handling ---
onAuthStateChanged(auth, async (user) => {
    try {
        if (!user) {
            window.location.replace("index.html");
        } else {
            currentPartnerEmail = user.email;
            
            // পার্টনারের প্রোফাইল ডাটা থেকে নাম আনা
            const partnerDoc = await getDoc(doc(db, "partners", user.email));
            if (partnerDoc.exists()) {
                document.getElementById('partnerNameDisplay').innerText = partnerDoc.data().agencyName || user.email;
            } else {
                document.getElementById('partnerNameDisplay').innerText = user.email;
            }

            // লোডার হাইড করা এবং বডি শো করা
            document.getElementById('loader').style.display = 'none';
            document.body.classList.add('auth-ready');
            
            loadAppData();
        }
    } catch (error) {
        console.error("Auth Error:", error);
        // এরর হলেও লোডার সরিয়ে দিন যাতে আপনি এরর দেখতে পারেন
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
    }
});

// --- ডাটা লোড ও উইথড্র কন্ডিশন ---
function loadAppData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", currentPartnerEmail));
    
    onSnapshot(q, (snap) => {
        let fullRows = "";
        let dashRows = "";
        let finalWallet = 0;

        snap.forEach(doc => {
            const data = doc.data();
            const statusColor = data.status === 'APPROVED' ? '#2ecc71' : (data.status === 'REJECTED' ? '#ff5e5e' : '#ffcc00');
            finalWallet += parseFloat(data.finalAmount || 0);

            // Full Tracking Table
            fullRows += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.contactNo || 'N/A'}</td>
                    <td>${data.passportNumber}</td>
                    <td><b style="color:${statusColor}">${data.status}</b></td>
                    <td>${data.compliancePerson || 'Assigning...'}</td>
                    <td><a href="${data.docUrl || '#'}" target="_blank" style="color:var(--gold)">View</a></td>
                    <td>${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
                </tr>
            `;

            // Dashboard Table (Home)
            dashRows += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.university}</td>
                    <td><b style="color:${statusColor}">${data.status}</b></td>
                    <td>${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : ''}</td>
                </tr>
            `;
        });

        document.getElementById('fullTrackingBody').innerHTML = fullRows || "<tr><td colspan='7'>No files found.</td></tr>";
        document.getElementById('homeLiveBody').innerHTML = dashRows || "<tr><td colspan='4'>No recent files.</td></tr>";
        document.getElementById('availAm').innerText = `৳ ${finalWallet.toLocaleString()}`;

        // Withdraw Button Condition
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (finalWallet > 0) {
            withdrawBtn.disabled = false;
        } else {
            withdrawBtn.disabled = true;
        }
    });
}

// --- প্রোফাইল সেভ ---
document.getElementById('saveProfileBtn').onclick = async () => {
    const agency = document.getElementById('profAgency').value;
    const phone = document.getElementById('profPhone').value;
    const address = document.getElementById('profAddress').value;

    if (!agency) return alert("Please enter Agency Name");

    try {
        await setDoc(doc(db, "partners", currentPartnerEmail), {
            agencyName: agency,
            phone: phone,
            address: address
        }, { merge: true });
        alert("Profile Updated Successfully!");
    } catch (e) {
        alert("Error saving profile: " + e.message);
    }
};

// Logout
document.getElementById('logoutBtn').onclick = () => signOut(auth);