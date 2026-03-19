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

// --- Login Logic (এটি আগে ছিল না, তাই বাটন কাজ করছিল না) ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !pass) return alert("Please enter email and password!");

    try {
        loginBtn.innerText = "Accessing...";
        loginBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore থেকে ইউজারের ডাটা এবং স্ট্যাটাস চেক করা
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();

            // স্ট্যাটাস চেক (অ্যাডমিন এপ্রুভ করেছে কি না)
            if (userData.status !== 'approved') {
                alert("আপনার অ্যাকাউন্টটি এখনো Approved নয়। বর্তমান স্ট্যাটাস: " + (userData.status || 'Pending'));
                await auth.signOut(); // এপ্রুভ না হলে লগআউট করে দিবে
                location.reload();
                return;
            }

            // রোল অনুযায়ী রিডাইরেক্ট
            const role = userData.role.toLowerCase();
            if (role === 'admin') {
                window.location.href = "admin.html";
            } else if (role === 'compliance') {
                window.location.href = "compliance.html";
            } else {
                window.location.href = "partner.html";
            }
        } else {
            alert("Error: ইউজার প্রোফাইল ডাটাবেজে পাওয়া যায়নি!");
        }

    } catch (error) {
        alert("Login Failed: " + error.message);
        loginBtn.innerText = "ACCESS PORTAL";
        loginBtn.disabled = false;
    }
}

// --- Cloudinary Upload ---
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
        return data.secure_url || "";
    } catch (e) {
        return "";
    }
}

// --- Registration Logic ---
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("সবগুলো তথ্য পূরণ করুন!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Processing...";
    regBtn.disabled = true;

    try {
        let tradeUrl = ""; 
        let nidUrl = "";
        
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];
            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore-এ ডাটা সেভ
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: role.toLowerCase(), // role-কে lowercase করে রাখা ভালো (admin, partner, compliance)
            status: 'pending',
            fullName: document.getElementById('pPerson')?.value || document.getElementById('cName')?.value || "",
            phone: document.getElementById('pContact')?.value || document.getElementById('cContact')?.value || "",
            agencyName: document.getElementById('pAgency')?.value || document.getElementById('cOrg')?.value || "",
            tradeLicense: tradeUrl,
            nidPdf: nidUrl,
            createdAt: new Date().toISOString()
        });

        alert("রেজিস্ট্রেশন সফল! অ্যাডমিন এপ্রুভ করার পর লগইন করতে পারবেন।");
        location.reload();

    } catch (error) {
        alert("Registration Error: " + error.message);
        regBtn.innerText = "SUBMIT REQUEST";
        regBtn.disabled = false;
    }
}

// --- Event Listeners ---
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
