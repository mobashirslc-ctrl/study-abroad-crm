import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// --- Cloudinary Upload (সঠিক Cloud Name: ddziennkh) ---
async function uploadToCloudinary(file) {
    if (!file) return "";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ihp_upload'); 

    try {
        console.log("Cloudinary-তে ফাইল আপলোড শুরু হচ্ছে...");
        // স্ক্রিনশট অনুযায়ী আপনার ক্লাউড নেম ddziennkh ব্যবহার করা হয়েছে
        const res = await fetch('https://api.cloudinary.com/v1_1/ddziennkh/auto/upload', { 
            method: 'POST', 
            body: formData 
        });
        
        const data = await res.json();
        if (data.secure_url) {
            console.log("ফাইল আপলোড সফল:", data.secure_url);
            return data.secure_url;
        } else {
            console.error("Cloudinary Error:", data.error.message);
            return "";
        }
    } catch (e) {
        console.error("Network Error:", e);
        return "";
    }
}

// --- Registration Logic ---
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("ইমেইল, পাসওয়ার্ড এবং রোল সিলেক্ট করুন!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "ফাইল আপলোড হচ্ছে... অপেক্ষা করুন";
    regBtn.disabled = true;

    try {
        let tradeUrl = ""; 
        let nidUrl = "";
        
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade').files[0];
            const nidFile = document.getElementById('pNid').files[0];

            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
            
            // যদি পার্টনার ফাইল সিলেক্ট করে কিন্তু আপলোড না হয়
            if (tradeFile && !tradeUrl) {
                throw new Error("Trade License আপলোড ব্যর্থ হয়েছে! আবার চেষ্টা করুন।");
            }
        }

        // Firebase-এ ইউজার তৈরি
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore-এ ডাটা সেভ (অ্যাডমিন প্যানেলের কলামের সাথে হুবহু মিল রেখে)
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false,
            status: 'pending',
            tradeLicense: tradeUrl, // এই ফিল্ডগুলো এখন আর খালি থাকবে না
            nidPdf: nidUrl,
            agencyName: document.getElementById('pAgency')?.value || "",
            personName: document.getElementById('pPerson')?.value || "",
            contact: document.getElementById('pContact')?.value || "",
            address: document.getElementById('pAddress')?.value || "",
            countries: document.getElementById('pService')?.value || "",
            createdAt: new Date().toISOString()
        });

        alert("রেজিস্ট্রেশন সফল হয়েছে! অ্যাডমিন প্যানেলে আপনার ডকুমেন্টগুলো এখন দেখা যাবে।");
        location.reload();

    } catch (error) {
        console.error("Error Detail:", error);
        alert("ভুল হয়েছে: " + error.message);
        regBtn.innerText = "SUBMIT REQUEST";
        regBtn.disabled = false;
    }
}

// Event Listener
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
