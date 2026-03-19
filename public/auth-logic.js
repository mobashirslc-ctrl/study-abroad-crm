import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. আপনার সঠিক Firebase Configuration
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

// ২. Cloudinary Upload Function (এখানের লিঙ্কে কোনো ভুল নেই)
async function uploadToCloudinary(file) {
    if (!file) return "";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); // আপনার Cloudinary তে এই প্রিসেটটি 'Unsigned' থাকতে হবে

    try {
        console.log("Cloudinary-তে ফাইল আপলোড শুরু হচ্ছে...");
        const res = await fetch('https://api.cloudinary.com/v1_1/dbtf7uocu/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        
        const data = await res.json();
        if (data.secure_url) {
            console.log("আপলোড সফল! লিঙ্ক:", data.secure_url);
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

    if (!role || !email || !pass) return alert("সবগুলো ঘর পূরণ করুন!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "ফাইল আপলোড হচ্ছে... অপেক্ষা করুন";
    regBtn.disabled = true;

    try {
        let tradeUrl = ""; 
        let nidUrl = "";
        
        // শুধু পার্টনারদের জন্য ফাইল আপলোড হবে
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];

            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        // Firebase Auth দিয়ে ইউজার তৈরি
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // ৪. Firestore-এ ডাটা সেভ (অ্যাডমিন প্যানেলের সাথে ১০০% ম্যাচ করা নাম)
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

        // নির্দিষ্ট রোলের তথ্য যোগ করা
        if (role === 'Partner') {
            userData.agencyName = document.getElementById('pAgency').value;
            userData.personName = document.getElementById('pPerson').value;
            userData.contact = document.getElementById('pContact').value;
            userData.address = document.getElementById('pAddress').value;
            userData.countries = document.getElementById('pService').value;
        } else if (role === 'Compliance') {
            userData.employeeName = document.getElementById('cName').value;
            userData.contact = document.getElementById('cContact').value;
            userData.organisation = document.getElementById('cOrg').value;
            userData.experience = document.getElementById('cExp').value;
            userData.countries = document.getElementById('cService').value;
        }

        await setDoc(doc(db, "users", user.uid), userData);
        alert("রেজিস্ট্রেশন সফল হয়েছে! অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।");
        location.reload();

    } catch (error) {
        alert("Error: " + error.message);
        regBtn.innerText = "SUBMIT REQUEST";
        regBtn.disabled = false;
    }
}

// ৫. Login Logic
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    if(!email || !pass) return alert("ইমেইল এবং পাসওয়ার্ড দিন");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();

            // অ্যাপ্রুভাল চেক
            if (!data.isApproved && data.status !== 'active') {
                alert("আপনার অ্যাকাউন্টটি এখনো পেন্ডিং আছে।");
                await signOut(auth);
                return;
            }

            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', data.role);
            window.location.href = data.role === 'Partner' ? "partner.html" : "compliance.html";
        }
    } catch (error) {
        alert("লগইন ব্যর্থ: " + error.message);
    }
}

// Event Listeners
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
