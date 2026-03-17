import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ২. Cloudinary সেটিংস (আপনার নতুন ড্যাশবোর্ড অনুযায়ী আপডেট করা)
const CLOUD_NAME = "ddziennkh"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ৩. ইউনিভার্সিটি লিস্ট লোড (Smart Assessment) ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;

    try {
        const q = query(collection(db, "universities"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        uniTable.innerHTML = ""; 

        if (querySnapshot.empty) {
            uniTable.innerHTML = "<tr><td colspan='11' style='text-align:center;'>No University found in database.</td></tr>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const name = u.universityName || "N/A";
            const country = u.country || "N/A";
            const course = u.courseName || "N/A";
            const fee = Number(u.semesterFee || 0);
            const comm = Number(u.partnerComm || 0);

            const bdtRate = 120; // ১ ডলার = ১২০ টাকা
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
        uniTable.innerHTML = `<tr><td colspan='11' style='color:red;'>Error loading data.</td></tr>`;
    }
}

// ৪. মডাল ওপেনিং লজিক
window.openApplyModal = (uniName) => {
    const modal = document.getElementById('studentFormModal');
    if(modal) {
        document.getElementById('sUni').value = uniName;
        modal.style.display = 'flex';
    }
};

// পেজ লোড হলে ইউনিভার্সিটি লিস্ট নিয়ে আসবে
fetchUniversities();

// --- ৫. Cloudinary ফাইল আপলোড ফাংশন ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Cloudinary Upload Failed');
    }
    return data.secure_url; 
}

// --- ৬. অ্যাপ্লিকেশন সাবমিট লজিক ---
const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    submitAppBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        const sPhone = document.getElementById('sPhone').value;
        const sUni = document.getElementById('sUni').value;
        const fileInput = document.getElementById('filePassport');
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));

        if (!sName || !sPass || !fileInput.files[0]) {
            return alert("অনুগ্রহ করে সব তথ্য দিন এবং পাসপোর্ট কপি আপলোড করুন!");
        }

        try {
            submitAppBtn.innerText = "Uploading File...";
            submitAppBtn.disabled = true;

            // ধাপ ১: ক্লাউডিনারিতে পাসপোর্ট আপলোড
            const passportURL = await uploadToCloudinary(fileInput.files[0]);

            // ধাপ ২: ফায়ারবেসে তথ্য সেভ
            submitAppBtn.innerText = "Saving Application...";
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNumber: sPass,
                contactNo: sPhone,
                university: sUni,
                partnerName: partnerData ? (partnerData.fullName || partnerData.name) : "Unknown",
                partnerEmail: partnerData ? partnerData.email : "N/A",
                passportDoc: passportURL,
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("সফলভাবে আবেদন জমা হয়েছে!");
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

// --- ৭. ফাইল ট্র্যাকিং লিস্ট লোড ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;

    try {
        const querySnapshot = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";

        querySnapshot.forEach((docSnap) => {
            const app = docSnap.data();
            const row = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo || 'N/A'}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:orange; color:black; padding:2px 8px; border-radius:5px;">${app.status}</span></td>
                    <td>Assigned Soon</td>
                    <td><a href="${app.passportDoc}" target="_blank" style="color:var(--gold);">View Doc</a></td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</td>
                </tr>
            `;
            trackTable.innerHTML += row;
        });
    } catch (err) {
        console.error("Tracking Error:", err);
    }
}
fetchTrackingData();
