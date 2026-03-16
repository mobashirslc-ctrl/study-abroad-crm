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

    // ২. রিয়েল-টাইম ডাটা লিসেনার (File Tracking & Wallet)
    const qApp = query(collection(db, "applications"), where("partnerEmail", "==", currentUser.email), orderBy("timestamp", "desc"));
    onSnapshot(qApp, (snap) => {
        let pending = 0, available = 0, homeRows = "", fullRows = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            pending += parseFloat(d.pendingAmount || 0);
            available += parseFloat(d.finalAmount || 0);
            const dateStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const statusColor = d.status === 'APPROVED' ? '#2ecc71' : (d.status === 'REJECTED' ? '#ff5e5e' : '#ffcc00');

            homeRows += `<tr><td>${d.studentName}</td><td>${d.university}</td><td><span style="color:${statusColor}">${d.status}</span></td><td>${dateStr}</td></tr>`;
            fullRows += `<tr><td>${d.studentName}</td><td>${d.contact || 'N/A'}</td><td>${d.passport || 'N/A'}</td><td><b style="color:${statusColor}">${d.status}</b></td><td>${d.compliancePerson || 'Pending'}</td><td><a href="${d.docLink || '#'}" target="_blank" style="color:var(--gold)">View Docs</a></td><td>${dateStr}</td></tr>`;
        });
        
        safeSetText('pendingAm', `৳ ${pending.toLocaleString()}`);
        safeSetText('availAm', `৳ ${available.toLocaleString()}`);
        safeSetText('walletDisplay', `৳ ${available.toLocaleString()}`);
        
        const homeBody = document.getElementById('homeLiveBody');
        if(homeBody) homeBody.innerHTML = homeRows || '<tr><td colspan="4">No activity found.</td></tr>';
        
        const trackingBody = document.getElementById('fullTrackingBody');
        if(trackingBody) trackingBody.innerHTML = fullRows || '<tr><td colspan="7">No files tracked.</td></tr>';
    });

    // ৩. স্মার্ট অ্যাসেসমেন্ট ও কমিশন ক্যালকুলেশন (Fix for Result showing)
    const searchBtn = document.getElementById('runSearchBtn');
    if(searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
            const gpaInput = parseFloat(document.getElementById('fAcad').value) || 0;
            const resCard = document.getElementById('searchResultCard');
            const resBody = document.getElementById('searchResultBody');

            if(!countryInput) { alert("Please enter a country name."); return; }
            resCard.style.display = 'block';
            resBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">Searching Universities...</td></tr>';

            try {
                const rate = 120; // 1 USD = 120 BDT (Admin Panel রেট অনুযায়ী)
                const snap = await getDocs(collection(db, "universities"));
                
                let html = "";
                let foundCount = 0;

                snap.forEach(uDoc => {
                    const u = uDoc.data();
                    const dbCountry = (u.country || "").toLowerCase();
                    const dbGPA = parseFloat(u.minGPA) || 0;

                    if (dbCountry.includes(countryInput) && gpaInput >= dbGPA) {
                        foundCount++;
                        // কমিশন লজিক: (Semester Fee * Partner %) * Rate
                        const commInUSD = parseFloat(u.semesterFee || 0) * (parseFloat(u.partnerComm || 0) / 100);
                        const commInBDT = commInUSD * rate;

                        html += `
                            <tr>
                                <td style="color:var(--gold); font-weight:600;">${u.universityName || u.name}</td>
                                <td>${u.country}</td>
                                <td>${u.courseName || u.course || 'Various'}</td>
                                <td>${u.intake || 'N/A'}</td>
                                <td>${u.minGPA}</td>
                                <td>${u.ielts || 'N/A'}</td>
                                <td>${u.duolingo || 'N/A'}</td>
                                <td>${u.pte || 'N/A'}</td>
                                <td>${u.moi || 'No'}</td>
                                <td style="color:var(--success); font-weight:bold;">৳ ${commInBDT.toLocaleString()}</td>
                                <td><button class="btn-gold" style="padding:5px 10px; font-size:10px; width:auto;" onclick="openFileApply('${uDoc.id}', '${u.universityName || u.name}')">Apply File</button></td>
                            </tr>`;
                    }
                });

                resBody.innerHTML = foundCount > 0 ? html : `<tr><td colspan="11" style="text-align:center;">No match found for "${countryInput}".</td></tr>`;
            } catch (e) { console.error(e); }
        });
    }

    // ৪. ফাইল সাবমিশন লজিক (File Open & Compliance Incoming)
    window.openFileApply = async (uniId, uniName) => {
        const sName = prompt("Enter Student Full Name:");
        const sPhone = prompt("Enter Student Phone Number:");
        const sPassport = prompt("Enter Passport Number:");
        
        if(!sName || !sPhone || !sPassport) {
            alert("All fields are required to open a file.");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "applications"), {
                studentName: sName,
                contact: sPhone,
                passport: sPassport,
                university: uniName,
                partnerEmail: currentUser.email,
                status: "INCOMING", // সরাসরি Compliance Incoming-এ যাবে
                timestamp: serverTimestamp(),
                pendingAmount: 0,
                finalAmount: 0,
                docLink: "#" // পরবর্তীতে পিডিএফ আপলোড লজিক অ্যাড করা যাবে
            });

            alert(`Application Submitted!\nAcknowledgment ID: SCC-${docRef.id.substring(0,6).toUpperCase()}`);
            showSection('tracking'); // সরাসরি ট্র্যাকিং সেকশনে নিয়ে যাবে
        } catch (e) { alert("Error: " + e.message); }
    };

    // প্রোফাইল আপডেট
    const updateBtn = document.getElementById('updateProfileBtn');
    if(updateBtn) {
        updateBtn.onclick = async () => {
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
    }

    // লগআউট
    const logout = document.getElementById('logoutBtn');
    if(logout) logout.onclick = () => signOut(auth);
}

function safeSetText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}