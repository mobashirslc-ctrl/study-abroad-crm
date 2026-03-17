import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ১. আপনার admin.html থেকে নেওয়া সঠিক Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ২. Cloudinary সেটিংস
const CLOUD_NAME = "dgq0v7zxp"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ৩. ইউনিভার্সিটি লোড ফাংশন (Admin Data-র সাথে ম্যাচ করা) ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;

    try {
        console.log("Loading Universities...");
        // admin.html অনুযায়ী কালেকশন 'universities'
        const q = query(collection(db, "universities"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        uniTable.innerHTML = ""; 

        if (querySnapshot.empty) {
            uniTable.innerHTML = "<tr><td colspan='11' style='text-align:center;'>কোনো ইউনিভার্সিটি পাওয়া যায়নি। অ্যাডমিন প্যানেলে ডেটা চেক করুন।</td></tr>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            
            // admin.html এর ফিল্ড নামের সাথে ম্যাপিং
            const name = u.universityName || "N/A";
            const country = u.country || "N/A";
            const course = u.courseName || "N/A";
            const fee = Number(u.semesterFee || 0);
            const comm = Number(u.partnerComm || 0);

            const bdtRate = 120; // Admin Header অনুযায়ী
            const bdtTotal = fee * bdtRate;
            const myCommission = (bdtTotal * comm) / 100;

            const row = `
                <tr>
                    <td><b>${name}</b></td>
                    <td>${country}</td>
                    <td>${course}</td>
                    <td>${u.intake || 'All Intake'}</td>
                    <td>${u.duration || 'N/A'}</td>
                    <td>$${fee}</td>
                    <td>USD</td>
                    <td>৳ ${bdtTotal.toLocaleString()}</td>
                    <td>${comm}%</td>
                    <td style="color: #2ecc71; font-weight: bold;">৳ ${myCommission.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${name}')">Apply Now</button></td>
                </tr>
            `;
            uniTable.innerHTML += row;
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        uniTable.innerHTML = `<tr><td colspan='11' style='color:red;'>Error: ${error.message}</td></tr>`;
    }
}

// ৪. মডাল ওপেনিং ফাংশন
window.openApplyModal = (uniName) => {
    const modal = document.getElementById('studentFormModal');
    if(modal) {
        document.getElementById('sUni').value = uniName;
        modal.style.display = 'flex';
    }
};

// পেজ লোড হলে ফাংশন কল
fetchUniversities();


// --- ৫. ফাইল আপলোড (Cloudinary) ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Cloudinary Upload Failed');
    const data = await response.json();
    return data.secure_url; 
}


// --- ৬. অ্যাপ্লিকেশন সাবমিট লজিক ---
const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    submitAppBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        const sUni = document.getElementById('sUni').value;
        const fileInput = document.getElementById('filePassport');
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));

        if (!sName || !sPass || !fileInput.files[0]) {
            return alert("সবগুলো ঘর পূরণ করুন এবং পাসপোর্ট কপি সিলেক্ট করুন!");
        }

        try {
            submitAppBtn.innerText = "Uploading Documents...";
            submitAppBtn.disabled = true;

            const passportURL = await uploadToCloudinary(fileInput.files[0]);

            submitAppBtn.innerText = "Saving Data...";
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNumber: sPass,
                university: sUni,
                partnerName: partnerData ? partnerData.fullName : "Unknown Partner",
                partnerEmail: partnerData ? partnerData.email : "N/A",
                passportDoc: passportURL,
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("আবেদন সফলভাবে গৃহীত হয়েছে!");
            location.reload();

        } catch (error) {
            console.error("Submit Error:", error);
            alert("Error: " + error.message);
        } finally {
            submitAppBtn.innerText = "Submit Application";
            submitAppBtn.disabled = false;
        }
    });
}
