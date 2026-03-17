import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// আপনার নতুন প্রজেক্টের কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyA_lOiKJFhvY1iL1jDA1KLVD6sHDNXlo0I",
  authDomain: "ihp-global-portal.firebaseapp.com",
  projectId: "ihp-global-portal",
  storageBucket: "ihp-global-portal.firebasestorage.app",
  messagingSenderId: "623093397069",
  appId: "1:623093397069:web:de3b3b7b1df15ad444ce04",
  measurementId: "G-2ZZQYJ1TY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
