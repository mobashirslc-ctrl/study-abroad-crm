import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    } else {
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        startDashboard(user); 
    }
});

function startDashboard(currentUser) {
    // ১. রিয়েল-টাইম ওয়ালেট এবং ট্র্যাকিং (Requirement 2 & 3)
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email));
    
    onSnapshot(qApp, (snap) => {
        let pending = 0;
        let available = 0;
        let homeRows = "";
        let fullRows = "";
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : '#ffcc00';

            // Home Page Table (Live Tracking)
            homeRows += `<tr>
                <td>${d.studentName}</td>
                <td>${d.university}</td>
                <td><span style="color:${statusColor}">${d.status}</span></td>
                <td>${dateStr}</td>
            </tr>`;

            // Full Tracking Table (Requirement 3)
            fullRows += `<tr>
                <td>${d.studentName}</td>
                <td>${d.contact || 'N/A'}</td>
                <td>${d.passport}</td>
                <td><b style="color:${statusColor}">${d.status}</b></td>
                <td>${d.compliancePerson || 'Pending'}</td>
                <td><a href="${d.docLink || '#'}" target="_blank" style="color:var(--gold)">View Docs</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });
        
        // Update Stats
        document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        document.getElementById('walletDisplay').innerText = `৳ ${available.toLocaleString()}`;
        
        // UI Updates
        document.getElementById('homeLiveBody').innerHTML = homeRows || '<tr><td colspan="4">No recent activity.</td></tr>';
        document.getElementById('fullTrackingBody').innerHTML = fullRows || '<tr><td colspan="7">No files tracked.</td></tr>';

        // Withdraw Button Logic (Requirement 4)
        const withdrawBtn = document.getElementById('requestWithdrawBtn');
        if(available >= 5000) {
            withdrawBtn.disabled = false;
            document.getElementById('withdrawNotice').style.display = 'none';
        } else {
            withdrawBtn.disabled = true;
            document.getElementById('withdrawNotice').style.display = 'block';
        }
    });

    // ২. প্রোফাইল সেটাপ (Requirement 5)
    const loadProfile = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if(userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('pName').value = userData.fullName || "";
            document.getElementById('pOrg').value = userData.orgName || "";
            document.getElementById('pPhone').value = userData.phone || "";
        }
    };
    loadProfile();

    document.getElementById('updateProfileBtn').onclick = async () => {
        try {
            await updateDoc(doc(db, "users", currentUser.uid), {
                fullName: document.getElementById('pName').value,
                orgName: document.getElementById('pOrg').value,
                phone: document.getElementById('pPhone').value
            });
            alert("Profile Updated!");
        } catch (e) { alert(e.message); }
    };

    // ৩. উইথড্রয়াল রিকোয়েস্ট
    document.getElementById('requestWithdrawBtn').onclick = async () => {
        const amount = parseFloat(document.getElementById('wAmount').value);
        const details = document.getElementById('wDetails').value;
        const method = document.getElementById('wMethod').value;

        if(amount < 5000) return alert("Minimum 5,000 BDT required!");
        
        try {
            await addDoc(collection(db, "withdrawals"), {
                partnerEmail: currentUser.email,
                amount: amount,
                method: method,
                details: details,
                status: "PENDING",
                timestamp: serverTimestamp()
            });
            alert("Withdrawal request sent!");
        } catch (e) { alert(e.message); }
    };

    // ৪. স্মার্ট অ্যাসেসমেন্ট (Language Filter যুক্ত)
    document.getElementById('runSearchBtn').onclick = async () => {
        const country = document.getElementById('fCountry').value.toLowerCase();
        const lang = document.getElementById('fLang').value;
        const gpa = parseFloat(document.getElementById('fAcad').value) || 0;

        // আপনার ইউনিভার্সিটি সার্চ লজিক এখানে কল হবে (আগের কোডের মতো)
        // জাস্ট ফিল্টারে lang ভেরিয়েবলটি চেক করবেন।
        alert("Searching for: " + country + " with " + lang);
    };

    // লগআউট
    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}