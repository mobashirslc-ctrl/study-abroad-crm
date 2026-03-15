import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = { /* সেম কনফিগ */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// লগইন ফাংশন
window.loginUser = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        alert("Login Successful!");
        window.location.href = "partner.html"; // বা ইউজারের রোল অনুযায়ী ডিরেক্ট
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// লগআউট ফাংশন
window.logoutUser = () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
};