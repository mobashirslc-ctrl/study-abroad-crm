import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ১. Firebase Config
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
const partnerEmail = (localStorage.getItem('partnerEmail') || '').toLowerCase().trim();

// ২. Cloudinary Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

let currentUni = ""; // Global variable to store selected university

// ৩. ফাইল আপলোড ফাংশন (Cloudinary)
async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const resp = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await resp.json();
        return data.secure_url; 
    } catch (err) {
        console.error("Cloudinary Error:", err);
        return null;
    }
}

// ৪. সার্চ লজিক (University Filter)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value; 
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        let found = false;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            const matchCountry = !countryInput || u.country.toLowerCase().includes(countryInput);
            const matchDegree = !degreeInput || (u.degree && u.degree.trim() === degreeInput.trim());

            if (matchCountry && matchDegree) {
                found = true;
                const totalFee = u.semesterFee * 120;
                const commission = (totalFee * (u.partnerComm || 0)) / 100;
                
                html += `
                <tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>${u.minGPA}</td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${commission.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">APPLY</button></td>
                </tr>`;
            }
        });

        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No exact match found.</td></tr>";
    } catch (e) {
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error! Check Console.</td></tr>";
    }
}

// ৫. অ্যাপ্লিকেশন সাবমিট লজিক (Cloudinary + Firebase)
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    
    if(!sName || !sPass) return alert("Please enter Student Name and Passport!");

    const submitBtn = document.querySelector('.btn-gold');
    submitBtn.innerText = "Processing... ⏳";
    submitBtn.disabled = true;

    try {
        // ফাইল আপলোড প্রসেস
        const fileInputs = ['file1', 'file2', 'file3', 'file4'];
        const uploadPromises = fileInputs.map(id => {
            const file = document.getElementById(id).files[0];
            return uploadFile(file);
        });

        const urls = await Promise.all(uploadPromises);

        // Firebase এ ডাটা পাঠানো
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: currentUni, 
            partnerEmail: partnerEmail,
            files: {
                passport: urls[0],
                academic: urls[1],
                language: urls[2],
                other: urls[3]
            },
            status: "Pending Assessment",
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            handledBy: "Waiting for Staff" 
        });

        alert("Application Submitted Successfully!");
        closeModal();
    } catch (e) {
        console.error("Submit Error:", e);
        alert("Submission failed. Try again.");
    } finally {
        submitBtn.innerText = "Submit Application";
        submitBtn.disabled = false;
    }
}

// ৬. মডাল এবং প্রোফাইল কন্ট্রোল
export function openApplyModal(uniName) {
    currentUni = uniName;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = 'block';
}

export function closeModal() {
    document.getElementById('applyModal').style.display = 'none';
}

// স্যাম্পল ফাংশন (এগুলো আপনার ডাটাবেস অনুযায়ী পরবর্তীতে লিখবেন)
export function initRealtimeData() { console.log("Dashboard Ready"); }
export function initTracking() { console.log("Tracking Ready"); }
export function requestWithdraw() { alert("Request Sent!"); }
export function updateProfile() { alert("Profile Updated!"); }