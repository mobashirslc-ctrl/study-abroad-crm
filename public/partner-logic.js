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
    const updatePartnerHeader = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if(userDoc.exists()) {
            const userData = userDoc.data();
            const welcomeBox = document.getElementById('welcomePartner');
            if(welcomeBox) welcomeBox.innerText = `Welcome, ${userData.fullName || 'Partner'}`;
        }
    };
    updatePartnerHeader();

    // real-time tracking
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
        
        if(document.getElementById('pendingAm')) document.getElementById('pendingAm').innerText = `৳ ${pending.toLocaleString()}`;
        if(document.getElementById('availAm')) document.getElementById('availAm').innerText = `৳ ${available.toLocaleString()}`;
        if(document.getElementById('walletDisplay')) document.getElementById('walletDisplay').innerText = `৳ ${available.toLocaleString()}`;
        if(document.getElementById('homeLiveBody')) document.getElementById('homeLiveBody').innerHTML = homeRows || '<tr><td colspan="4">No activity.</td></tr>';
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = fullRows || '<tr><td colspan="7">No files.</td></tr>';

        const withdrawBtn = document.getElementById('requestWithdrawBtn');
        if(withdrawBtn) {
            if(available >= 5000) {
                withdrawBtn.disabled = false;
                document.getElementById('withdrawNotice').style.display = 'none';
            } else {
                withdrawBtn.disabled = true;
                document.getElementById('withdrawNotice').innerText = "* Min 5,000 BDT required";
            }
        }
    });

    // Profile Load & Update
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
            updatePartnerHeader();
        } catch (e) { alert(e.message); }
    };

    // SEARCH BUTTON ACTIVATION
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        searchBtn.onclick = async () => {
            const country = document.getElementById('fCountry').value;
            const langType = document.getElementById('fLang').value;
            const langScore = document.getElementById('fLangScore').value;
            
            if(!country) {
                alert("Please enter a country name.");
                return;
            }

            console.log("Search Triggered:", country, langType, langScore);
            alert(`Searching for ${country} with ${langType} (Score: ${langScore}). Results will appear soon.`);
        };
    }

    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}