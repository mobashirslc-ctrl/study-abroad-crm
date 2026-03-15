import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// আপনার প্রজেক্ট কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
  authDomain: "scc-partner-portal.firebaseapp.com",
  databaseURL: "https://scc-partner-portal-default-rtdb.firebaseio.com",
  projectId: "scc-partner-portal",
  storageBucket: "scc-partner-portal.firebasestorage.app",
  messagingSenderId: "13013457431",
  appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// লগইন ফাংশন
window.loginUser = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    
    if(!email || !pass) {
        alert("Please enter both email and password.");
        return;
    }

    btn.innerText = "Authenticating...";
    btn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // সফলভাবে লগইন হলে পার্টনার ড্যাশবোর্ডে নিয়ে যাবে
        window.location.href = "partner.html"; 
    } catch (error) {
        console.error("Error code:", error.code);
        alert("Login Failed: " + error.message);
        btn.innerText = "Sign In";
        btn.disabled = false;
    }
};