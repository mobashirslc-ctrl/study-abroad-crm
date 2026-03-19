import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration (Verified from your Image 887)
const firebaseConfig = {
    apiKey: "AIzaSyDonKHMy dghjn3nAwjtsvQFDyT-78DGqOk", // স্ক্রিনশটের মতো স্পেস সহ দেওয়া হয়েছে
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

// Cloudinary Upload Function (Unsigned 'ihp_upload' from Image 891)
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

// registration process (Step 1.3, 1.4, 1.5 & 1.6)
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) {
        alert("Please fill in Email, Password, and Role.");
        return;
    }

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Uploading Files...";
    regBtn.disabled = true;

    try {
        let tradeUrl = "", nidUrl = "";
        
        // Partner specific file uploads
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];
            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        // Firebase Auth User Creation
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // User Data Object
        let userData = {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false, // Default: Pending Admin Approval
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

        // Save to Firestore
        await setDoc(doc(db, "users", user.uid), userData);
        alert("Registration Submitted! Wait for Admin Approval.");
        location.reload();

    } catch (error) {
        console.error("Firebase Error:", error.code);
        alert("Error: " + error.message);
        regBtn.innerText = "Submit Request";
        regBtn.disabled = false;
    }
}

// Login Process (Admin approval guard)
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    if (!email || !pass) return alert("Enter email and password.");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();

            if (!data.isApproved) {
                alert("Account Pending! Your registration is not yet approved.");
                await signOut(auth);
                return;
            }

            // Success: Store and Redirect
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', data.role);
            window.location.href = data.role === 'Partner' ? "partner.html" : "compliance.html";
        }
    } catch (error) {
        alert("Login Error: " + error.message);
    }
}

// Connect Buttons
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
