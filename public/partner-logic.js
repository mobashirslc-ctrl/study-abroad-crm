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

// Global State
let selectedUniversity = "";
const partnerEmail = (localStorage.getItem('partnerEmail') || '').toLowerCase().trim();

// ১. ইউনিভার্সিটি সার্চ লজিক (Admin Data Sync)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value; 
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching Universities...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        let found = false;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            
            // ফিল্টারিং লজিক: অ্যাডমিনের সেভ করা ডাটার সাথে ড্রপডাউন চেক
            const matchCountry = !countryInput || u.country.toLowerCase().includes(countryInput);
            const matchDegree = !degreeInput || (u.degree === degreeInput);

            if (matchCountry && matchDegree) {
                found = true;
                const totalFee = (u.semesterFee || 0) * 120;
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

        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No matches found. Try another search.</td></tr>";
    } catch (e) {
        console.error("Search error:", e);
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Connection Error! Check Console.</td></tr>";
    }
}

// ২. ফাইল আপলোড (Cloudinary)
async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', "ihp_upload");

    try {
        const resp = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/image/upload", { method: 'POST', body: formData });
        const data = await resp.json();
        return data.secure_url;
    } catch (err) {
        console.error("Cloudinary error:", err);
        return null;
    }
}

// ৩. স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;

    if(!sName || !sPass) return alert("Student name and passport are required!");

    const btn = document.querySelector('.btn-gold');
    btn.innerText = "Processing... ⏳";
    btn.disabled = true;

    try {
        // ফাইল প্রসেসিং
        const fileIds = ['file1', 'file2', 'file3', 'file4'];
        const uploadPromises = fileIds.map(id => uploadFile(document.getElementById(id).files[0]));
        const urls = await Promise.all(uploadPromises);

        // Firebase এ সাবমিশন
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
            submittedAt: serverTimestamp(),
            handledBy: "Waiting for Staff"
        });

        alert("Application Submitted Successfully!");
        window.closeModal();
        location.reload(); 
    } catch (e) {
        console.error("Firebase Error:", e);
        alert("Submission failed. Please check your connection.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
}

// ৪. মডাল হ্যান্ডলিং (Global Visibility)
window.openApplyModal = (uniName) => {
    selectedUniversity = uniName;
    const modal = document.getElementById('applyModal');
    if (modal) {
        document.getElementById('modalTitle').innerText = "Apply for " + uniName;
        modal.style.display = 'block';
    }
};

window.closeModal = () => {
    document.getElementById('applyModal').style.display = 'none';
};

export function initRealtimeData() { console.log("System Ready."); }
export function initTracking() { console.log("Tracking Ready."); }