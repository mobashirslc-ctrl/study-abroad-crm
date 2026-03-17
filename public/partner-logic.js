import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ১. আপনার নতুন প্রজেক্টের কনফিগ (Verified)
const firebaseConfig = {
  apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk",
  authDomain: "ihp-portal-v3.firebaseapp.com",
  projectId: "ihp-portal-v3",
  storageBucket: "ihp-portal-v3.firebasestorage.app",
  messagingSenderId: "481157902534",
  appId: "1:481157902534:web:2d9784032fbf0f2f7fe7c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ২. Cloudinary সেটিংস
const CLOUD_NAME = "dgq0v7zxp"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ৩. ইউনিভার্সিটি ডাটা লোড করার ফাংশন (Smart Assessment) ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;

    try {
        console.log("Fetching universities...");
        const querySnapshot = await getDocs(collection(db, "universities")); 
        uniTable.innerHTML = ""; 

        if (querySnapshot.empty) {
            uniTable.innerHTML = "<tr><td colspan='11' style='text-align:center;'>কোনো ইউনিভার্সিটি পাওয়া যায়নি। অ্যাডমিন প্যানেল চেক করুন।</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // ফিল্ড ম্যাপিং (আপনার অ্যাডমিন প্যানেলের ডাটা অনুযায়ী)
            const uniName = data.uniName || data.name || "N/A";
            const country = data.country || "N/A";
            const course = data.course || "N/A";
            const fee = parseFloat(data.semesterFee || data.fee || 0);
            const commPercentage = parseFloat(data.partnerComm || data.commission || 0);
            
            // হিসাব-নিকাশ (BDT কনভার্শন ও কমিশন)
            const bdtRate = 125; // ধরুন ১ ডলার = ১২৫ টাকা
            const bdtEquiv = fee * bdtRate;
            const yourCommission = (bdtEquiv * commPercentage) / 100;

            const row = `
                <tr>
                    <td><b>${uniName}</b></td>
                    <td>${country}</td>
                    <td>${course}</td>
                    <td>${data.intake || 'N/A'}</td>
                    <td>${data.duration || 'N/A'}</td>
                    <td>$${fee}</td>
                    <td>USD</td>
                    <td>৳ ${bdtEquiv.toLocaleString()}</td>
                    <td>${commPercentage}%</td>
                    <td style="color: #2ecc71; font-weight: bold;">৳ ${yourCommission.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${uniName}')">Apply</button></td>
                </tr>
            `;
            uniTable.innerHTML += row;
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        uniTable.innerHTML = `<tr><td colspan='11' style='color:red;'>ডাটা লোড করতে সমস্যা: ${error.message}</td></tr>`;
    }
}

// মডাল ওপেন করার ফাংশন (গ্লোবাল রাখা হয়েছে যাতে HTML থেকে কাজ করে)
window.openApplyModal = (uniName) => {
    document.getElementById('sUni').value = uniName;
    document.getElementById('studentFormModal').style.display = 'flex';
};

// পেজ লোড হওয়া মাত্রই ডাটা আনবে
fetchUniversities();


// --- ৪. Cloudinary ফাইল আপলোড ফাংশন ---
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


// --- ৫. স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট লজিক ---
const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    submitAppBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // পেজ রিলোড হওয়া আটকাবে

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

            // ধাপ ১: Cloudinary-তে ফাইল পাঠানো
            const passportURL = await uploadToCloudinary(file);

            // ধাপ ২: Firestore-এ ডাটা সেভ করা
            submitAppBtn.innerText = "তথ্য সেভ হচ্ছে...";
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNumber: sPass,
                university: sUni,
                partnerName: partnerData ? partnerData.name : "Unknown Partner",
                passportDoc: passportURL, // Cloudinary লিঙ্ক
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("আবেদন সফলভাবে সাবমিট হয়েছে!");
            location.reload();

        } catch (error) {
            console.error("Submit Error:", error);
            alert("ত্রুটি: " + error.message);
        } finally {
            submitAppBtn.innerText = "Submit Application";
            submitAppBtn.disabled = false;
        }
    });
}
