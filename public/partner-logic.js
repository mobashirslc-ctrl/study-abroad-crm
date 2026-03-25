import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ২. Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

let selectedUniversity = ""; // এটি গ্লোবাল রাখুন

// ৩. ফাইল আপলোড ফাংশন
async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
        const resp = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await resp.json();
        return data.secure_url; 
    } catch (err) { return null; }
}

// ৪. ইউনিভার্সিটি সার্চ (Degree Case-Insensitive Fix)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value.toLowerCase().trim(); 
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        let found = false;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            // ডাটাবেসের ডিগ্রিকেও ছোট হাতের করে চেক করা হচ্ছে যাতে ভুল না হয়
            const dbDegree = (u.degree || "").toLowerCase().trim();
            
            const matchCountry = !countryInput || u.country.toLowerCase().includes(countryInput);
            const matchDegree = !degreeInput || dbDegree === degreeInput;

            if (matchCountry && matchDegree) {
                found = true;
                html += `
                <tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>${u.minGPA}</td>
                    <td>৳${(u.semesterFee * 120).toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${(u.semesterFee * 120 * (u.partnerComm || 0) / 100).toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No matching university found.</td></tr>";
    } catch (e) {
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Error loading data.</td></tr>";
    }
}

// ৫. অ্যাপ্লিকেশন সাবমিট (Merged)
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    
    if(!sName || !sPass) return alert("Please enter Student Name and Passport!");

    const submitBtn = document.querySelector('.btn-gold');
    submitBtn.innerText = "Processing... Please wait";
    submitBtn.disabled = true;

    try {
        const fileInputs = ['file1', 'file2', 'file3', 'file4'];
        const urls = await Promise.all(fileInputs.map(id => uploadFile(document.getElementById(id).files[0])));

        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity, 
            partnerEmail: partnerEmail,
            files: {
                passport: urls[0],
                academic: urls[1],
                language: urls[2],
                other: urls[3]
            },
            status: "Pending Assessment",
            submittedAt: serverTimestamp()
        });

        alert("Application Submitted!");
        closeModal();
        location.reload(); // ডাটা আপডেট দেখানোর জন্য পেজ রিফ্রেশ
    } catch (e) {
        alert("Error submitting file.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Application";
    }
}

// ৬. কন্ট্রোল ফাংশনস
export function openApplyModal(uniName) {
    selectedUniversity = uniName;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = 'block';
}

export function closeModal() {
    document.getElementById('applyModal').style.display = 'none';
}

// খালি ফাংশনগুলো সচল রাখা
export function initRealtimeData() {}
export function initTracking() {}