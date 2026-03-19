import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk",
    authDomain: "ihp-portal-v3.firebaseapp.com",
    projectId: "ihp-portal-v3",
    storageBucket: "ihp-portal-v3.firebasestorage.app",
    messagingSenderId: "481157902534",
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Cloudinary Upload Function ---
async function uploadToCloudinary(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); 

    try {
        const res = await fetch('https://api.cloudinary.com/v1_1/ddziennkh/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        const data = await res.json();
        if (data.secure_url) return data.secure_url;
        throw new Error(data.error?.message || "Cloudinary upload failed");
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return ""; // ফাইল আপলোড না হলে খালি স্ট্রিং পাঠাবে
    }
}

// --- Registration Logic ---
async function handleRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("Email, Password and Role are required!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Processing... Please Wait";
    regBtn.disabled = true;

    try {
        let tradeUrl = ""; 
        let nidUrl = "";
        
        // ফাইল আপলোড অংশ
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade')?.files[0];
            const nidFile = document.getElementById('pNid')?.files[0];
            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        // Firebase Auth User Creation
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore Data Mapping (Safe Access using Optional Chaining)
        const userData = {
            uid: user.uid,
            email: email,
            role: role.toLowerCase(),
            status: 'pending',
            isApproved: false,
            fullName: document.getElementById('pPerson')?.value || document.getElementById('cName')?.value || "N/A",
            phone: document.getElementById('pContact')?.value || document.getElementById('cContact')?.value || "N/A",
            agencyName: document.getElementById('pAgency')?.value || document.getElementById('cOrg')?.value || "N/A",
            tradeLicense: tradeUrl,
            nidPdf: nidUrl,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", user.uid), userData);

        alert("Registration Successful! Please wait for Admin approval.");
        location.reload();

    } catch (error) {
        alert("Registration Error: " + error.message);
        regBtn.innerText = "SUBMIT REQUEST";
        regBtn.disabled = false;
    }
}

// --- Login Logic ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !pass) return alert("Enter email and password!");

    try {
        loginBtn.innerText = "Accessing...";
        loginBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentStatus = (userData.status || "").toLowerCase();

            if (currentStatus !== 'approved') {
                alert("Account not approved. Status: " + userData.status);
                await auth.signOut();
                location.reload();
                return;
            }

            const role = (userData.role || "").toLowerCase();
            if (role === 'admin') window.location.href = "admin.html";
            else if (role === 'compliance') window.location.href = "compliance.html";
            else window.location.href = "partner.html";

        } else {
            alert("Profile not found in database!");
            loginBtn.innerText = "ACCESS PORTAL";
            loginBtn.disabled = false;
        }

    } catch (error) {
        alert("Login Failed: " + error.message);
        loginBtn.innerText = "ACCESS PORTAL";
        loginBtn.disabled = false;
    }
}

// Listeners
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
