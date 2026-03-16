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
    // ১. পার্টনারের নাম টপ-রাইট কর্নারে সেট করা
    const updatePartnerHeader = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if(userDoc.exists()) {
            const userData = userDoc.data();
            const welcomeBox = document.getElementById('welcomePartner');
            if(welcomeBox) {
                welcomeBox.innerText = `Welcome, ${userData.fullName || 'Partner'}`;
            }
        }
    };
    updatePartnerHeader();

    // ২. রিয়েল-টাইম ওয়ালেট এবং ট্র্যাকিং ডাটা লোড করা
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

            // ড্যাশবোর্ড টেবিল
            homeRows += `<tr>
                <td>${d.studentName}</td>
                <td>${d.university}</td>
                <td><span style="color:${statusColor}">${d.status}</span></td>
                <td>${dateStr}</td>
            </tr>`;

            // ফুল ট্র্যাকিং টেবিল
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
        
        document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        document.getElementById('walletDisplay').innerText = `৳ ${available.toLocaleString()}`;
        
        document.getElementById('homeLiveBody').innerHTML = homeRows || '<tr><td colspan="4">No recent activity.</td></tr>';
        document.getElementById('fullTrackingBody').innerHTML = fullRows || '<tr><td colspan="7">No files tracked.</td></tr>';

        // উইথড্র বাটন লজিক (৫০০০ টাকার বেশি হলে একটিভ হবে)
        const withdrawBtn = document.getElementById('requestWithdrawBtn');
        if(available >= 5000) {
            withdrawBtn.disabled = false;
            document.getElementById('withdrawNotice').style.display = 'none';
        } else {
            withdrawBtn.disabled = true;
            document.getElementById('withdrawNotice').style.display = 'block';
        }
    });

    // ৩. প্রোফাইল সেটাপ ডাটা লোড এবং আপডেট
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
            updatePartnerHeader(); // হেডার নামও সাথে সাথে আপডেট হবে
        } catch (e) { alert(e.message); }
    };

    // ৪. উইথড্রয়াল রিকোয়েস্ট পাঠানো
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

    // ৫. স্মার্ট অ্যাসেসমেন্ট (নতুন স্কোর ফিল্ডসহ)
    document.getElementById('runSearchBtn').onclick = async () => {
        const country = document.getElementById('fCountry').value.toLowerCase();
        const langType = document.getElementById('fLang').value;
        const langScore = document.getElementById('fLangScore').value; // নতুন স্কোর বক্সের ডাটা
        const gpa = parseFloat(document.getElementById('fAcad').value) || 0;

        if(!country) {
            alert("Please enter a country name.");
            return;
        }

        // সার্চ কনফার্মেশন (এখানে আপনার ইউনিভার্সিটি ডাটাবেজ ফিল্টারিং লজিক বসবে)
        alert(`Searching for ${country.toUpperCase()} with ${langType} (Score: ${langScore})`);
    };

    // লগআউট লজিক
    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}