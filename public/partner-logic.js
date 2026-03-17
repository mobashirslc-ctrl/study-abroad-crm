import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ১. আপনার নতুন প্রজেক্টের কনফিগ
const firebaseConfig = {
  apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk",
  authDomain: "ihp-portal-v3.firebaseapp.com",
  projectId: "ihp-portal-v3",
  storageBucket: "ihp-portal-v3.firebasestorage.app",
  messagingSenderId: "481157902534",
  appId: "1:481157902534:web:2d9784032fbf0f2f7fe7c7",
  measurementId: "G-P9S5BHTY6F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ২. Cloudinary সেটিংস
const CLOUD_NAME = "dgq0v7zxp"; 
const UPLOAD_PRESET = "ihp_upload"; 

// ৩. ফাইল আপলোড ফাংশন (Cloudinary)
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Cloudinary Upload Failed');
    }

    const data = await response.json();
    return data.secure_url; 
}

// ৪. স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট লজিক
const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    submitAppBtn.onclick = async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        const sUni = document.getElementById('sUni').value;
        const fileInput = document.getElementById('filePassport');
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));

        if (!sName || !sPass || !fileInput.files[0]) {
            return alert("সবগুলো ঘর পূরণ করুন এবং ফাইল সিলেক্ট করুন!");
        }

        const file = fileInput.files[0];

        try {
            submitAppBtn.innerText = "ফাইল আপলোড হচ্ছে...";
            submitAppBtn.disabled = true;

            // ধাপ ১: Cloudinary-তে পাসপোর্ট আপলোড
            const passportURL = await uploadToCloudinary(file);

            // ধাপ ২: Firestore-এ ডাটা সেভ
            submitAppBtn.innerText = "তথ্য সেভ হচ্ছে...";
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNumber: sPass,
                university: sUni,
                partnerName: partnerData ? partnerData.name : "Unknown Partner",
                partnerEmail: partnerData ? partnerData.email : "N/A",
                passportDoc: passportURL, // Cloudinary লিঙ্ক
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("সফলভাবে সাবমিট হয়েছে!");
            location.reload();

        } catch (error) {
            console.error("Error details:", error);
            alert("সমস্যা হয়েছে: " + error.message);
        } finally {
            submitAppBtn.innerText = "Submit Application";
            submitAppBtn.disabled = false;
        }
    };
}
