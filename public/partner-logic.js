import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ২. Cloudinary Settings (ddziennkh - Your Correct Cloud Name)
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

        querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const fee = Number(u.semesterFee || 0);
            const bdtTotal = fee * 120;
            const myCommission = (bdtTotal * Number(u.partnerComm || 0)) / 100;

            const row = `
                <tr>
                    <td><b>${u.universityName || 'N/A'}</b></td>
                    <td>${u.country || 'N/A'}</td>
                    <td>${u.courseName || 'N/A'}</td>
                    <td>${u.intake || 'All'}</td>
                    <td>${u.duration || 'N/A'}</td>
                    <td>$${fee}</td>
                    <td>USD</td>
                    <td>৳ ${bdtTotal.toLocaleString()}</td>
                    <td>${u.partnerComm}%</td>
                    <td style="color: #2ecc71; font-weight: bold;">৳ ${myCommission.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">Apply Now</button></td>
                </tr>`;
            uniTable.innerHTML += row;
        });
    } catch (error) { console.error("Fetch Error:", error); }
}

window.openApplyModal = (uniName) => {
    document.getElementById('sUni').value = uniName;
    document.getElementById('studentFormModal').style.display = 'flex';
};

fetchUniversities();

// --- ৪. Cloudinary আপলোড ফাংশন ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Cloudinary Error');
    
    // Secure URL নিশ্চিত করা
    return data.secure_url; 
}

// --- ৫. স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট লজিক ---
const submitAppBtn = document.getElementById('submitAppBtn');
if (submitAppBtn) {
    submitAppBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('filePassport');
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));

        if (!fileInput.files[0]) return alert("Please select a file!");

        try {
            submitAppBtn.innerText = "Uploading..."; submitAppBtn.disabled = true;

            const passportURL = await uploadToCloudinary(fileInput.files[0]);

            await addDoc(collection(db, "applications"), {
                studentName: document.getElementById('sName').value,
                passportNumber: document.getElementById('sPass').value,
                contactNo: document.getElementById('sPhone').value,
                university: document.getElementById('sUni').value,
                partnerEmail: partnerData?.email || "N/A",
                passportDoc: passportURL,
                status: "Pending Compliance",
                createdAt: serverTimestamp()
            });

            alert("Success!"); location.reload();
        } catch (error) {
            alert("Error: " + error.message);
            submitAppBtn.innerText = "Submit Application"; submitAppBtn.disabled = false;
        }
    });
}

// --- ৬. ট্র্যাকিং লিস্ট (401 Error Force Fix) ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;

    try {
        const snap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";

        snap.forEach((docSnap) => {
            const app = docSnap.data();
            
            // Cloudinary লিঙ্ককে ব্রাউজারে ফোর্স করার জন্য লজিক
            let finalURL = app.passportDoc ? app.passportDoc.replace("http://", "https://") : "#";
            
            // যদি 401 এরর থাকে, তবে ক্লাউডিনারির fl_attachment ফ্ল্যাগটি লিঙ্ককে পাবলিক করতে সাহায্য করে
            if (finalURL.includes("upload/")) {
                finalURL = finalURL.replace("upload/", "upload/fl_attachment/");
            }

            const row = `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo || 'N/A'}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:orange; color:black; padding:2px 8px; border-radius:5px;">${app.status}</span></td>
                    <td>Assigned Soon</td>
                    <td>
                        <a href="${finalURL}" target="_blank" rel="noopener noreferrer" style="color:var(--gold); font-weight:bold;">
                           <i class="fa-solid fa-file-pdf"></i> View Doc
                        </a>
                    </td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Now'}</td>
                </tr>`;
            trackTable.innerHTML += row;
        });
    } catch (err) { console.error("Tracking error:", err); }
}
fetchTrackingData();
