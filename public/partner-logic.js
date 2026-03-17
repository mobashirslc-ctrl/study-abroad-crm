import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const CLOUD_NAME = "ddziennkh"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ৩. University List ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;
    try {
        const q = query(collection(db, "universities"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        uniTable.innerHTML = ""; 
        snap.forEach((docSnap) => {
            const u = docSnap.data();
            const bdtTotal = Number(u.semesterFee || 0) * 120;
            const comm = (bdtTotal * Number(u.partnerComm || 0)) / 100;
            uniTable.innerHTML += `
                <tr>
                    <td><b>${u.universityName}</b></td>
                    <td>${u.country}</td>
                    <td>${u.courseName}</td>
                    <td>${u.intake || 'All'}</td>
                    <td>${u.duration || 'N/A'}</td>
                    <td>$${u.semesterFee}</td>
                    <td>USD</td>
                    <td>৳ ${bdtTotal.toLocaleString()}</td>
                    <td>${u.partnerComm}%</td>
                    <td style="color: #2ecc71; font-weight: bold;">৳ ${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">Apply Now</button></td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

window.openApplyModal = (u) => {
    document.getElementById('sUni').value = u;
    document.getElementById('studentFormModal').style.display = 'flex';
};
fetchUniversities();

// --- ৫. Cloudinary Upload ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // সরাসরি HTTPS API ব্যবহার করা হচ্ছে
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { 
        method: 'POST', 
        body: formData 
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Upload Failed');
    
    // Secure URL রিটার্ন করবে
    return data.secure_url; 
}

// --- ৬. Submit Application ---
document.getElementById('submitAppBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitAppBtn');
    const fileInput = document.getElementById('filePassport');
    const partnerData = JSON.parse(localStorage.getItem('partnerData'));

    if (!fileInput.files[0]) return alert("Please upload passport copy!");

    try {
        btn.innerText = "Uploading..."; btn.disabled = true;
        const url = await uploadToCloudinary(fileInput.files[0]);

        await addDoc(collection(db, "applications"), {
            studentName: document.getElementById('sName').value,
            passportNumber: document.getElementById('sPass').value,
            contactNo: document.getElementById('sPhone').value,
            university: document.getElementById('sUni').value,
            partnerEmail: partnerData?.email || "N/A",
            passportDoc: url,
            status: "Pending Compliance",
            createdAt: serverTimestamp()
        });

        alert("Application Submitted!");
        location.reload();
    } catch (e) { 
        alert("Error: " + e.message); 
        btn.innerText = "Submit Application"; 
        btn.disabled = false; 
    }
});

// --- ৭. Tracking List (401 Error Fix) ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;
    try {
        const snap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";
        snap.forEach((docSnap) => {
            const app = docSnap.data();
            
            // ৪৫১ এরর এড়াতে আমরা URL টি সরাসরি ব্রাউজারে ওপেন করার জন্য প্রস্তুত করছি
            const viewURL = app.passportDoc;

            trackTable.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:orange; color:black; padding:2px 8px; border-radius:5px;">${app.status}</span></td>
                    <td>Assigned Soon</td>
                    <td>
                        <a href="${viewURL}" target="_blank" rel="noopener noreferrer" style="color:var(--gold); font-weight:bold; text-decoration:underline;">
                           View Document
                        </a>
                    </td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Now'}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}
fetchTrackingData();
