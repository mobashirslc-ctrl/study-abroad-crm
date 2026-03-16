// partner-logic.js (Updated & Final)

// ১. পাথ ফিক্স করা হয়েছে (../ দিয়ে রুট ফোল্ডারের কনফিগ ফাইল ধরা হয়েছে)
import { db, auth, storage } from "../firebase-config.js"; 
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- INITIALIZATION & AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Partner authenticated:", user.email);
        document.body.classList.add('auth-ready');
        
        // লোডার রিমুভ করা
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        
        // ডাটা লোড করা
        await loadPartnerProfile(user);
        loadPartnerStats(user.uid);
        listenToLiveTracking(user.uid);
    } else {
        // লগইন না করা থাকলে রিডাইরেক্ট
        window.location.href = "login.html";
    }
});

// --- ১. PROFILE & WELCOME LOGIC ---
async function loadPartnerProfile(user) {
    try {
        const docRef = doc(db, "partners", user.uid);
        const docSnap = await getDoc(docRef);
        const nameDisplay = document.getElementById('pNameText');
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(nameDisplay) nameDisplay.innerText = data.agencyName || "Valued Partner";
            
            // প্রোফাইল এডিট ফর্মের ভ্যালু সেট করা
            if(document.getElementById('profAgency')) document.getElementById('profAgency').value = data.agencyName || "";
            if(document.getElementById('profPhone')) document.getElementById('profPhone').value = data.phone || "";
            if(document.getElementById('profAddress')) document.getElementById('profAddress').value = data.address || "";
        } else {
            if(nameDisplay) nameDisplay.innerText = user.email.split('@')[0];
        }
    } catch (err) {
        console.error("Profile loading failed:", err);
    }
}

// --- ২. UNIVERSITY SEARCH LOGIC ---
const runSearchBtn = document.getElementById('runSearchBtn');
if (runSearchBtn) {
    runSearchBtn.addEventListener('click', async () => {
        const country = document.getElementById('fCountry').value.trim();
        const degree = document.getElementById('fDegree').value;
        const resultsBody = document.getElementById('uniResultsBody');
        const resArea = document.getElementById('resArea');

        if(!country) return alert("Please select or type a country name");

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
                if (degree && uni.degree !== degree) return;

                resultsBody.innerHTML += `
                    <tr>
                        <td>${uni.name}</td>
                        <td>${uni.country}</td>
                        <td>${uni.degree}</td>
                        <td style="color:var(--gold); font-weight:bold;">${uni.commission || 'Contact Support'}</td>
                        <td><button class="btn-gold" onclick="openAppModal('${uni.name}')">Apply Now</button></td>
                    </tr>`;
            });
        } catch (error) {
            console.error("Search Error:", error);
            resultsBody.innerHTML = "<tr><td colspan='5'>Error fetching data. Check Firebase permissions.</td></tr>";
        }
    });
}

// --- ৩. LIVE TRACKING LOGIC (REAL-TIME) ---
function listenToLiveTracking(uid) {
    const q = query(collection(db, "applications"), where("partnerId", "==", uid));
    
    onSnapshot(q, (snapshot) => {
        const dashLiveBody = document.getElementById('dashLiveBody');
        const fullTrackingBody = document.getElementById('fullTrackingBody');
        let dashHTML = ""; let fullHTML = "";

        snapshot.forEach((doc) => {
            const app = doc.data();
            const statusColor = app.status === "Approved" ? "#2ecc71" : app.status === "Rejected" ? "#ff5e5e" : "#ffcc00";
            
            const row = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.university}</td>
                    <td><span style="color:${statusColor}; font-weight:bold;">${app.status}</span></td>
                    <td>${app.date || 'Recent'}</td>
                </tr>`;
            dashHTML += row;

            const fullRow = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.passport}</td>
                    <td>${app.university}</td>
                    <td><span style="color:${statusColor}">${app.status}</span></td>
                    <td>${app.compliance || 'Pending'}</td>
                    <td>${app.date}</td>
                </tr>`;
            fullHTML += fullRow;
        });

        if(dashLiveBody) dashLiveBody.innerHTML = dashHTML || "<tr><td colspan='4'>No recent activity</td></tr>";
        if(fullTrackingBody) fullTrackingBody.innerHTML = fullHTML || "<tr><td colspan='6'>No records found</td></tr>";
    });
}

// --- ৪. APPLICATION SUBMISSION ---
let selectedUni = "";

// মডিউল স্কোপের কারণে ফাংশনটিকে window অবজেক্টে রাখতে হবে
window.openAppModal = function(name) {
    selectedUni = name;
    const modalTitle = document.getElementById('mTitle');
    const modal = document.getElementById('appModal');
    if(modalTitle) modalTitle.innerText = "Apply for: " + name;
    if(modal) modal.style.display = 'flex';
};

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        const sContact = document.getElementById('sContact') ? document.getElementById('sContact').value : "";

        if (!sName || !sPass) return alert("Student Name and Passport are required!");

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Submitting...";

            await addDoc(collection(db, "applications"), {
                partnerId: user.uid,
                studentName: sName,
                passport: sPass,
                contact: sContact,
                university: selectedUni,
                status: "Processing",
                date: new Date().toLocaleDateString(),
                timestamp: serverTimestamp()
            });

            alert("Application Submitted Successfully!");
            document.getElementById('appModal').style.display = 'none';
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Final Submission";
        }
    });
}

// --- ৫. STATS & PROFILE UPDATE ---
async function loadPartnerStats(uid) {
    const wallet = document.getElementById('walletBalance');
    if(wallet) wallet.innerText = "৳ 0.00"; 
}

// প্রোফাইল আপডেট
const saveProfileBtn = document.getElementById('saveProfileBtn');
if(saveProfileBtn) {
    saveProfileBtn.onclick = async () => {
        const user = auth.currentUser;
        const name = document.getElementById('profAgency').value;
        const phone = document.getElementById('profPhone').value;
        const address = document.getElementById('profAddress').value;

        try {
            await updateDoc(doc(db, "partners", user.uid), {
                agencyName: name,
                phone: phone,
                address: address
            });
            alert("Profile Updated Successfully!");
            location.reload();
        } catch (err) {
            alert("Failed to update profile: " + err.message);
        }
    };
}

// লগআউট
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = () => signOut(auth);
}