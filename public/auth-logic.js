import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. আপনার দেওয়া সর্বশেষ সঠিক Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk", // Verified API Key
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

// ২. Cloudinary আপলোড ফাংশন (ihp_upload preset)
async function uploadToCloudinary(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); 

    try {
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        const data = await res.json();
        return data.secure_url || "";
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return "";
    }
}

// ৩. রেজিস্ট্রেশন প্রসেস (PRD অনুযায়ী)
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) {
        alert("Please fill in Email, Password, and select a Role.");
        return;
    }

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Processing Assets...";
    regBtn.disabled = true;

    try {
        let tradeUrl = "", nidUrl = "";
        
        // পার্টনার হলে ফাইল আপলোড হবে
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];
            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        // Firebase-এ ইউজার তৈরি
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore ডাটা অবজেক্ট
        let userData = {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false, // ডিফল্টভাবে পেন্ডিং থাকবে
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

        // Firestore-এ সেভ করা
        await setDoc(doc(db, "users", user.uid), userData);
        alert("Registration Successful! Now waiting for Admin Approval.");
        location.reload();

    } catch (error) {
        alert("Registration Error: " + error.message);
        regBtn.innerText = "Submit Request";
        regBtn.disabled = false;
    }
}

// ৪. লগইন প্রসেস (অ্যাপ্রুভাল চেক সহ)
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    if (!email || !pass) return alert("Please enter email and password.");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();

            // অ্যাপ্রুভাল চেক লজিক
            if (!data.isApproved) {
                alert("Your account is pending! Admin has not approved you yet.");
                await signOut(auth);
                return;
            }

            // সেশন ডাটা রাখা এবং রিডিরেক্ট
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', data.role);
            window.location.href = data.role === 'Partner' ? "partner.html" : "compliance.html";
        }
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
}

// ইভেন্ট লিসেনার কানেক্ট করা
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
