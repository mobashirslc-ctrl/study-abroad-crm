// ১. সেশন চেক (একদম শুরুতে থাকবে)
const currentUser = localStorage.getItem('partnerEmail');

if (!currentUser) {
    alert("Please login first!");
    window.location.href = "/login"; 
}

// ২. গ্লোবাল স্টেট এবং ইমেইল হ্যান্ডলিং
let currentUniCommission = 0;
let selectedUniversity = "";
const partnerEmail = currentUser.toLowerCase().trim(); // সরাসরি সেশন থেকে নেওয়া হচ্ছে

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
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

// ৩. ইউনিভার্সিটি সার্চ লজিক
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value.trim();
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        let found = false;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            const dbDegree = u.degree ? u.degree.trim() : "";
            const dbCountry = u.country ? u.country.toLowerCase().trim() : "";

            const matchCountry = !countryInput || dbCountry.includes(countryInput);
            const matchDegree = !degreeInput || (dbDegree === degreeInput);

            if (matchCountry && matchDegree) {
                found = true;
                const totalFee = (u.semesterFee || 0) * 120;
                const comm = (totalFee * (u.partnerComm || 0)) / 100;

                html += `
                <tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>${u.minGPA}</td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', ${comm})">APPLY</button></td>
                </tr>`;
            }
        });

        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No university found!</td></tr>";
    } catch (e) {
        console.error(e);
    }
}

// ৪. ফাইল আপলোড (Cloudinary)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return null;
    }
}

// ৫. স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;

    if(!sName || !sPass) return alert("Student name and passport are required!");

    const btn = document.querySelector('.btn-gold');
    btn.innerText = "Processing... ⏳";
    btn.disabled = true;

    try {
        const fileIds = ['file1', 'file2', 'file3', 'file4'];
        const uploadPromises = fileIds.map(id => uploadFile(document.getElementById(id).files[0]));
        const urls = await Promise.all(uploadPromises);

        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity,
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission,
            pdf1: urls[0] || "", 
            pdf2: urls[1] || "", 
            pdf3: urls[2] || "", 
            pdf4: urls[3] || "", 
            status: "PENDING",
            submittedAt: serverTimestamp(),
            handledBy: "" 
        });

        alert("Application Submitted Successfully!");
        window.closeModal();
        location.reload(); 
    } catch (e) {
        console.error("Firebase Error:", e);
        alert("Submission failed.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
}

// ৬. মডাল এবং গ্লোবাল ফাংশন
window.openApplyModal = (uniName, commission) => {
    selectedUniversity = uniName;
    currentUniCommission = commission;
    const modal = document.getElementById('applyModal');
    if (modal) {
        document.getElementById('modalTitle').innerText = "Apply for " + uniName;
        modal.style.display = 'block';
    }
};

window.closeModal = () => {
    document.getElementById('applyModal').style.display = 'none';
};

// সাইন আউট ফাংশন
window.logout = () => {
    localStorage.removeItem('partnerEmail'); // সেশন ডিলিট করবে
    alert("Logged out successfully!");
    window.location.href = "/login"; // লগইন পেজে পাঠিয়ে দিবে
};
export function initRealtimeData() { console.log("System Ready."); }
export function initTracking() { console.log("Tracking Ready."); }