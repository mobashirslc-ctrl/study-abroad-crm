import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const CLOUD_NAME = "dgq0v7zxp"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ১. ইউনিভার্সিটি লোড করার লজিক (Search Function) ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;

    try {
        const q = query(collection(db, "universities")); // আপনার কালেকশন নাম 'universities' হতে হবে
        const querySnapshot = await getDocs(q);
        uniTable.innerHTML = ""; // আগের ডাটা ক্লিয়ার করুন

        if (querySnapshot.empty) {
            uniTable.innerHTML = "<tr><td colspan='11' style='text-align:center;'>কোনো ইউনিভার্সিটি পাওয়া যায়নি।</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.country || 'N/A'}</td>
                    <td>${data.course || 'N/A'}</td>
                    <td>${data.intake || 'N/A'}</td>
                    <td>${data.duration || 'N/A'}</td>
                    <td>${data.fee || '0'}</td>
                    <td>${data.currency || 'USD'}</td>
                    <td>-</td>
                    <td>${data.commission || '0'}%</td>
                    <td>-</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${data.name}')">Apply</button></td>
                </tr>
            `;
            uniTable.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading universities:", error);
    }
}

// মডাল ওপেন করার গ্লোবাল ফাংশন
window.openApplyModal = (uniName) => {
    document.getElementById('sUni').value = uniName;
    document.getElementById('studentFormModal').style.display = 'flex';
};

// পেজ লোড হলে ইউনিভার্সিটি দেখাবে
fetchUniversities();


// --- ২. ফাইল আপলোড ও সাবমিট লজিক ---
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
        throw new Error(errorData.error.message || 'Upload failed');
    }

    const data = await response.json();
    return data.secure_url; 
}

const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    // onclick এর বদলে addEventListener ব্যবহার করা ভালো
    submitAppBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
        
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

            const passportURL = await uploadToCloudinary(file);

            submitAppBtn.innerText = "তথ্য সেভ হচ্ছে...";
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNumber: sPass,
                university: sUni,
                partnerName: partnerData ? partnerData.name : "Unknown Partner",
                passportDoc: passportURL,
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("সফলভাবে সাবমিট হয়েছে!");
            location.reload();

        } catch (error) {
            console.error("Error:", error);
            alert("সমস্যা হয়েছে: " + error.message);
        } finally {
            submitAppBtn.innerText = "Submit Application";
            submitAppBtn.disabled = false;
        }
    });
}
