import { db, auth, storage } from "./firebase-config.js";
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Partner authenticated:", user.email);
        document.body.classList.add('auth-ready');
        document.getElementById('loader').style.display = 'none';
        
        // ১. পার্টনার নাম ও প্রোফাইল সেটআপ
        await loadPartnerProfile(user);
        
        // ২. ডাটা লোড করা (Stats & Tracking)
        loadPartnerStats(user.uid);
        listenToLiveTracking(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// --- ১. PROFILE & WELCOME LOGIC ---
async function loadPartnerProfile(user) {
    const docRef = doc(db, "partners", user.uid);
    const docSnap = await getDoc(docRef);
    
    const nameDisplay = document.getElementById('pNameText');
    if (docSnap.exists()) {
        const data = docSnap.data();
        nameDisplay.innerText = data.agencyName || "Valued Partner";
        
        // প্রোফাইল সেকশনে ভ্যালু বসানো
        if(document.getElementById('profAgency')) document.getElementById('profAgency').value = data.agencyName || "";
        if(document.getElementById('profPhone')) document.getElementById('profPhone').value = data.phone || "";
        if(document.getElementById('profAddress')) document.getElementById('profAddress').value = data.address || "";
    } else {
        nameDisplay.innerText = user.email.split('@')[0];
    }
}

// --- ২. SEARCH UNIVERSITY LOGIC (FIXED) ---
const runSearchBtn = document.getElementById('runSearchBtn');
if (runSearchBtn) {
    runSearchBtn.addEventListener('click', async () => {
        const country = document.getElementById('fCountry').value.trim();
        const degree = document.getElementById('fDegree').value;
        const resultsBody = document.getElementById('uniResultsBody');
        const resArea = document.getElementById('resArea');

        console.log("Searching for:", country, degree);
        resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Searching Universities...</td></tr>";
        resArea.style.display = 'block';

        try {
            const q = query(collection(db, "universities"), where("country", "==", country));
            const querySnapshot = await getDocs(q);
            
            resultsBody.innerHTML = "";
            if (querySnapshot.empty) {
                resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No University Found for this country.</td></tr>";
                return;
            }

            querySnapshot.forEach((doc) => {
                const uni = doc.data();
                // Degree ফিল্টার (যদি সিলেক্ট করা থাকে)
                if (degree && uni.degree !== degree) return;

                const row = `
                    <tr>
                        <td>${uni.name}</td>
                        <td>${uni.country}</td>
                        <td>${uni.degree}</td>
                        <td style="color:var(--gold); font-weight:bold;">${uni.commission || 'Contact Support'}</td>
                        <td><button class="btn-gold" onclick="openAppModal('${uni.name}', '${doc.id}')">Apply Now</button></td>
                    </tr>
                `;
                resultsBody.innerHTML += row;
            });
        } catch (error) {
            console.error("Search Error:", error);
            alert("Search failed. Please try again.");
        }
    });
}

// --- ৩. LIVE TRACKING LOGIC (DASHBOARD & TRACKING SECTION) ---
function listenToLiveTracking(uid) {
    const q = query(collection(db, "applications"), where("partnerId", "==", uid));
    
    onSnapshot(q, (snapshot) => {
        const dashLiveBody = document.getElementById('dashLiveBody');
        const fullTrackingBody = document.getElementById('fullTrackingBody');
        
        let dashHTML = "";
        let fullHTML = "";

        snapshot.forEach((doc) => {
            const app = doc.data();
            const statusColor = app.status === "Approved" ? "#2ecc71" : app.status === "Rejected" ? "#ff5e5e" : "#ffcc00";
            
            const row = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.university}</td>
                    <td><span style="color:${statusColor}; font-weight:bold;">${app.status}</span></td>
                    <td>${app.date || 'Recent'}</td>
                </tr>
            `;
            dashHTML += row; // Dashboard live tracking

            const fullRow = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.passport}</td>
                    <td>${app.university}</td>
                    <td><span style="color:${statusColor}">${app.status}</span></td>
                    <td>${app.compliance || 'Pending'}</td>
                    <td>${app.date}</td>
                </tr>
            `;
            fullHTML += fullRow; // Full tracking section
        });

        if(dashLiveBody) dashLiveBody.innerHTML = dashHTML || "<tr><td colspan='4'>No recent activity</td></tr>";
        if(fullTrackingBody) fullTrackingBody.innerHTML = fullHTML || "<tr><td colspan='6'>No records found</td></tr>";
    });
}

// --- ৪. APPLICATION SUBMISSION ---
let selectedUni = "";
window.openAppModal = function(name) {
    selectedUni = name;
    document.getElementById('mTitle').innerText = "Apply: " + name;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('submitBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;

    if (!sName || !sPass) return alert("Fill required fields");

    try {
        await addDoc(collection(db, "applications"), {
            partnerId: user.uid,
            studentName: sName,
            passport: sPass,
            university: selectedUni,
            status: "Processing",
            date: new Date().toLocaleDateString(),
            timestamp: new Date()
        });
        alert("Application Submitted!");
        document.getElementById('appModal').style.display = 'none';
    } catch (e) {
        alert("Error submitting: " + e.message);
    }
});

// --- ৫. STATS & LOGOUT ---
async function loadPartnerStats(uid) {
    // এখানে আপনার ব্যালেন্স লজিক বসাতে পারেন
    document.getElementById('walletBalance').innerText = "৳ 0";
}

document.getElementById('logoutBtn').onclick = () => signOut(auth);

// প্রোফাইল আপডেট বাটন
document.getElementById('saveProfileBtn').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('profAgency').value;
    const phone = document.getElementById('profPhone').value;
    const address = document.getElementById('profAddress').value;

    await updateDoc(doc(db, "partners", user.uid), {
        agencyName: name,
        phone: phone,
        address: address
    });
    alert("Profile Updated!");
    location.reload();
};