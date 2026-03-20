import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
        return data.secure_url || "";
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return "";
    }
}

// --- Registration Logic ---
async function handleRegister() {
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role || !email || !pass) return alert("Email, Password and Role are required!");

    const regBtn = document.getElementById('regBtn');
    regBtn.innerText = "Processing..."; regBtn.disabled = true;

    try {
        let tradeUrl = "", nidUrl = "";
        
        if (role === 'Partner') {
            const tradeFile = document.getElementById('pTrade')?.files[0];
            const nidFile = document.getElementById('pNid')?.files[0];
            if (tradeFile) tradeUrl = await uploadToCloudinary(tradeFile);
            if (nidFile) nidUrl = await uploadToCloudinary(nidFile);
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const userData = {
            uid: user.uid,
            email: email,
            role: role.toLowerCase(),
            status: 'pending', // Default status
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
        regBtn.innerText = "SUBMIT REQUEST"; regBtn.disabled = false;
    }
}

// --- Login Logic (Fixed Back-Loop Problem) ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !pass) return alert("Enter credentials!");

    try {
        loginBtn.innerText = "Accessing Portal..."; loginBtn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Firestore থেকে ইউজার ডেটা আনা
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // স্ট্যাটাস এবং রোল ছোট হাতের অক্ষরে কনভার্ট করে চেক করা (Safe Check)
            const status = (userData.status || "").toLowerCase();
            const role = (userData.role || "").toLowerCase();

            // স্ট্যাটাস APPROVED বা ACTIVE যেকোনোটি থাকলেই হবে
            if (role !== 'admin' && status !== 'approved' && status !== 'active') {
                alert("Access Denied! Your status is: " + status.toUpperCase());
                await signOut(auth); // সাইন আউট করে সেশন ক্লিয়ার করা
                location.reload();
                return;
            }

            // সেশন ডাটা সেভ করা যাতে ড্যাশবোর্ড চিনতে পারে
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', role);

            // রোল অনুযায়ী সঠিক ড্যাশবোর্ডে পাঠানো
            if (role === 'admin') {
                window.location.href = "admin.html";
            } else if (role === 'compliance') {
                window.location.href = "compliance.html";
            } else {
                window.location.href = "partner.html";
            }

        } else {
            alert("No user profile found in Database!");
            await signOut(auth);
            location.reload();
        }

    } catch (error) {
        alert("Login Failed: " + error.message);
        loginBtn.innerText = "ACCESS PORTAL"; loginBtn.disabled = false;
    }
}

// Button Listeners
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
