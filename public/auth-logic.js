import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. Firebase Configuration (From Image 887)
const firebaseConfig = {
    apiKey: "AIzaSyDonKHMy dghjn3nAwjtsvQFDyT-78DGqOk",
    authDomain: "ihp-portal-v3.firebaseapp.com",
    projectId: "ihp-portal-v3",
    storageBucket: "ihp-portal-v3.firebasestorage.app",
    messagingSenderId: "481157902534",
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7",
    measurementId: "G-P9S5BHTY6F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ২. Cloudinary Upload Function (Using 'ihp_upload' preset from Image 891)
async function uploadToCloudinary(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); // আপনার স্ক্রিনশট অনুযায়ী Unsigned প্রিসেট

    try {
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        const data = await res.json();
        return data.secure_url;
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return "";
    }
}

// ৩. Registration Function (Unified Step 1)
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("Please fill all required fields!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Processing Files...";
    regBtn.disabled = true;

    try {
        let tradeUrl = "", nidUrl = "";
        
        // রোল অনুযায়ী ফাইল হ্যান্ডলিং (Step 1.4)
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];
            tradeUrl = await uploadToCloudinary(tradeFile);
            nidUrl = await uploadToCloudinary(nidFile);
        }

        // Auth ইউজার তৈরি
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore ডাটা অবজেক্ট (Step 1.4 & 1.5)
        let userData = {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false, // Step 1.6: Admin approval logic
            createdAt: new Date().toISOString()
        };

        if (role === 'Partner') {
            userData.agencyName = document.getElementById('pAgency').value;
            userData.personName = document.getElementById('pPerson').value;
            userData.contact = document.getElementById('pContact').value;
            userData.address = document.getElementById('pAddress').value;
            userData.countries = document.getElementById('pService').value;
            userData.tradeLicense = tradeUrl;
            userData.nidPdf = nidUrl;
        } else if (role === 'Compliance') {
            userData.employeeName = document.getElementById('cName').value;
            userData.contact = document.getElementById('cContact').value;
            userData.organisation = document.getElementById('cOrg').value;
            userData.experience = document.getElementById('cExp').value;
            userData.countries = document.getElementById('cService').value;
        }

        await setDoc(doc(db, "users", user.uid), userData);
        alert("Registration Request Submitted! Wait for Admin Approval.");
        location.reload();

    } catch (error) {
        alert("Registration Failed: " + error.message);
        regBtn.innerText = "Submit Request";
        regBtn.disabled = false;
    }
}

// ৪. Login Function (Step 1.6)
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();

            if (!data.isApproved) {
                alert("Account Pending! Admin has not approved you yet.");
                await signOut(auth);
                return;
            }

            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', data.role);
            window.location.href = data.role === 'Partner' ? "partner.html" : "compliance.html";
        }
    } catch (error) {
        alert("Login Error: " + error.message);
    }
}

// Event Listeners
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
