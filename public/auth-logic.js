import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// --- Login Logic ---
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !pass) return alert("Enter credentials!");

    try {
        loginBtn.innerText = "Verifying..."; loginBtn.disabled = true;

        // ১. ফায়ারবেস অথেন্টিকেশন
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // ২. ডাটাবেস থেকে ইউজার চেক (UID দিয়ে)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const status = (userData.status || "pending").toLowerCase();
            const role = (userData.role || "partner").toLowerCase();

            // ৩. স্ট্যাটাস চেক (অ্যাডমিন ছাড়া সবার জন্য 'active' বাধ্যতামূলক)
            if (role !== 'admin' && status !== 'active') {
                alert("Access Denied! Your status is: " + status.toUpperCase());
                await signOut(auth);
                location.reload();
                return;
            }

            // ৪. সেশন স্টোরেজ সেভ (এটি ড্যাশবোর্ড চেক করবে)
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', role);

            // ৫. রিডাইরেক্ট
            if (role === 'admin') window.location.href = "admin.html";
            else if (role === 'compliance') window.location.href = "compliance.html";
            else window.location.href = "partner.html";

        } else {
            alert("No Firestore record found for this User UID!");
            await signOut(auth);
            location.reload();
        }

    } catch (error) {
        alert("Login Failed: " + error.message);
        loginBtn.innerText = "ACCESS PORTAL"; loginBtn.disabled = false;
    }
}

document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
