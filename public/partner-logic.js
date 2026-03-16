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

// Auth state monitor
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');
    if (!user) {
        window.location.replace("index.html");
    } else {
        if(loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        startDashboard(user); 
    }
});

function startDashboard(currentUser) {
    // ১. আপডেট হেডার নাম
    const updatePartnerHeader = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if(userDoc.exists()) {
                const userData = userDoc.data();
                const welcomeBox = document.getElementById('welcomePartner');
                if(welcomeBox) welcomeBox.innerText = `Welcome, ${userData.fullName || 'Partner'}`;
            }
        } catch (e) { console.error("Header Error:", e); }
    };
    updatePartnerHeader();

    // ২. রিয়েল-টাইম ডাটা লিসেনার
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email));
    onSnapshot(qApp, (snap) => {
        let pending = 0, available = 0, homeRows = "", fullRows = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : '#ffcc00';

            homeRows += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:${statusColor}">${d.status}</span></td><td>${dateStr}</td></tr>`;
            fullRows += `<tr><td>${d.studentName}</td><td>${d.contact || 'N/A'}</td><td>${d.passport}</td><td><b style="color:${statusColor}">${d.status}</b></td><td>${d.compliancePerson || 'Pending'}</td><td><a href="${d.docLink || '#'}" target="_blank" style="color:var(--gold)">View Docs</a></td><td>${dateStr}</td></tr>`;
        });
        
        safeSetText('pendingAm', `৳ ${pending.toLocaleString()}`);
        safeSetText('availAm', `৳ ${available.toLocaleString()}`);
        safeSetText('walletDisplay', `৳ ${available.toLocaleString()}`);
        
        const homeBody = document.getElementById('homeLiveBody');
        if(homeBody) homeBody.innerHTML = homeRows || '<tr><td colspan="4">No activity found.</td></tr>';
        
        const trackingBody = document.getElementById('fullTrackingBody');
        if(trackingBody) trackingBody.innerHTML = fullRows || '<tr><td colspan="7">No files tracked.</td></tr>';

        const withdrawBtn = document.getElementById('requestWithdrawBtn');
        if(withdrawBtn) {
            if(available >= 5000) {
                withdrawBtn.disabled = false;
                document.getElementById('withdrawNotice').style.display = 'none';
            } else {
                withdrawBtn.disabled = true;
                const notice = document.getElementById('withdrawNotice');
                if(notice) notice.innerText = "* Min 5,000 BDT required to withdraw";
            }
        }
    });

    // ৩. প্রোফাইল হ্যান্ডলার
    const updateBtn = document.getElementById('updateProfileBtn');
    if(updateBtn) {
        updateBtn.onclick = async () => {
            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    fullName: document.getElementById('pName').value,
                    orgName: document.getElementById('pOrg').value,
                    phone: document.getElementById('pPhone').value
                });
                alert("Profile Updated Successfully!");
                updatePartnerHeader();
            } catch (e) { alert("Error: " + e.message); }
        };
    }

    // ৪. সার্চ বাটন অ্যাক্টিভেশন (এখানেই আপনার সমস্যা ছিল)
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        // আগের ইভেন্ট রিমুভ করে নতুন করে সেট করা হচ্ছে
        searchBtn.addEventListener('click', () => {
            const country = document.getElementById('fCountry').value;
            const langType = document.getElementById('fLang').value;
            const langScore = document.getElementById('fLangScore').value;
            const gpa = document.getElementById('fAcad').value;

            if(!country) {
                alert("Please enter a country name to start search.");
                return;
            }

            console.log("Assessment Query:", {country, langType, langScore, gpa});
            alert(`Searching Database for: ${country.toUpperCase()}\nTest: ${langType} (${langScore})\nGPA: ${gpa}\n\nPlease wait while we fetch the best universities...`);
            
            // এখানে আপনি চাইলে সার্চ রেজাল্ট দেখানোর জন্য আলাদা ফাংশন কল করতে পারেন
        });
    }

    // লগআউট
    const logout = document.getElementById('logoutBtn');
    if(logout) logout.onclick = () => signOut(auth);
}

// Helper function to prevent null errors
function safeSetText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}