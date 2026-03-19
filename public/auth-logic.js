import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. Firebase Configuration
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

// ২. Cloudinary Upload Function (এখানের লিঙ্কে 'auto' ব্যবহার করা হয়েছে যাতে PDF সাপোর্ট করে)
async function uploadToCloudinary(file) {
    if (!file) return "";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); // আপনার Unsigned Preset Name

    try {
        console.log("Uploading file to Cloudinary...");
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        
        const data = await res.json();
        if (data.secure_url) {
            console.log("Upload Success:", data.secure_url);
            return data.secure_url;
        } else {
            console.error("Cloudinary Error:", data);
            return "";
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        return "";
    }
}

// ৩. Registration Logic
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("Please fill all fields!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "UPLOADING DOCUMENTS...";
    regBtn.disabled = true;

    try {
        let tradeUrl = ""; 
        let nidUrl = "";
        
        // ফাইল আপলোড না হওয়া পর্যন্ত এখানে অপেক্ষা করবে (AWAIT)
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];

            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        // Firebase Auth দিয়ে ইউজার তৈরি
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // ৪. Firestore-এ ডাটা সেভ (অ্যাডমিন প্যানেলের সাথে সিঙ্ক করা)
        let userData = {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false,
            status: 'pending',
            tradeLicense: tradeUrl, // অ্যাডমিন প্যানেল এই নামেই খুঁজবে
            nidPdf: nidUrl,        // অ্যাডমিন প্যানেল এই নামেই খুঁজবে
            createdAt: new Date().toISOString()
        };

        if (role === 'Partner') {
            userData.agencyName = document.getElementById('pAgency').value;
            userData.personName = document.getElementById('pPerson').value;
            userData.contact = document.getElementById('pContact').value;
            userData.address = document.getElementById('pAddress').value;
            userData.countries = document.getElementById('pService').value;
        } else if (role === 'Compliance') {
            userData.employeeName = document.getElementById('cName').value;
            userData.contact = document.getElementById('cContact').value;
        }

        await setDoc(doc(db, "users", user.uid), userData);
        alert("Registration Successful! Please wait for Admin Approval.");
        location.reload();

    } catch (error) {
        alert("Registration Error: " + error.message);
        regBtn.innerText = "SUBMIT REQUEST";
        regBtn.disabled = false;
    }
}

// ৪. Login Logic
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();

            // অ্যাপ্রুভাল চেক
            if (!data.isApproved && data.status !== 'active') {
                alert("Account Pending Approval!");
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
