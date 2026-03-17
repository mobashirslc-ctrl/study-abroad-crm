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

// ২. Cloudinary Settings
const CLOUD_NAME = "ddziennkh"; 
const UPLOAD_PRESET = "ihp_upload"; 

// --- ৩. ইউনিভার্সিটি লিস্ট লোড ---
async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;
    try {
        const q = query(collection(db, "universities"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        uniTable.innerHTML = ""; 
        snap.forEach((docSnap) => {
            const u = docSnap.data();
            const fee = Number(u.semesterFee || 0);
            const bdtTotal = fee * 120;
            const comm = (bdtTotal * Number(u.partnerComm || 0)) / 100;

            uniTable.innerHTML += `
                <tr>
                    <td><b>${u.universityName}</b></td>
                    <td>${u.country}</td>
                    <td>${u.courseName}</td>
                    <td>${u.intake || 'All'}</td>
                    <td>$${fee}</td>
                    <td>৳ ${bdtTotal.toLocaleString()}</td>
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

// --- ৪. Cloudinary আপলোড ফাংশন ---
async function uploadToCloudinary(file) {
    if(!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { 
        method: 'POST', 
        body: formData 
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Upload Failed');
    return data.secure_url; 
}

// --- ৫. সাবমিট অ্যাপ্লিকেশন (৪টি ফাইল সহ) ---
document.getElementById('submitAppBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitAppBtn');
    
    // Inputs
    const name = document.getElementById('sName').value;
    const passNum = document.getElementById('sPass').value;
    const phone = document.getElementById('sPhone').value;
    const uni = document.getElementById('sUni').value;
    const partnerName = localStorage.getItem('partnerName') || "Our Partner";

    // Files
    const filePass = document.getElementById('filePassport').files[0];
    const fileAcad = document.getElementById('fileAcademic').files[0];
    const fileLang = document.getElementById('fileLanguage').files[0];
    const fileOther = document.getElementById('fileOthers').files[0];

    if (!name || !passNum || !filePass || !fileAcad) {
        return alert("Please fill Name, Passport Number and upload mandatory documents (Passport & Academic)!");
    }

    try {
        btn.innerText = "Uploading Documents..."; btn.disabled = true;

        // ৪টি ফাইল প্যারালাল আপলোড (যদি থাকে)
        const [urlPass, urlAcad, urlLang, urlOther] = await Promise.all([
            uploadToCloudinary(filePass),
            uploadToCloudinary(fileAcad),
            uploadToCloudinary(fileLang),
            uploadToCloudinary(fileOther)
        ]);

        btn.innerText = "Opening File...";
        
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            passportNumber: passNum,
            contactNo: phone,
            university: uni,
            partnerName: partnerName,
            docs: {
                passport: urlPass,
                academic: urlAcad,
                language: urlLang,
                others: urlOther
            },
            status: "Pending Compliance",
            createdAt: serverTimestamp()
        });

        // সফল হলে স্লিপ দেখানো (html ফাইলে থাকা ফাংশন কল করা)
        if(window.showSuccessSlip) {
            window.showSuccessSlip({
                id: docRef.id,
                studentName: name,
                passport: passNum,
                partner: partnerName,
                university: uni
            });
        }

    } catch (e) { 
        alert("Error: " + e.message); 
        btn.innerText = "Submit Application"; 
        btn.disabled = false; 
    }
});

// --- ৬. ট্র্যাকিং লিস্ট লোড ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;
    try {
        const snap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";
        snap.forEach((docSnap) => {
            const app = docSnap.data();
            trackTable.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:#f1c40f; color:black; padding:2px 8px; border-radius:5px; font-size:11px;">${app.status}</span></td>
                    <td>Pending</td>
                    <td><a href="${app.docs?.passport}" target="_blank" style="color:var(--gold);">View Pass</a></td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Just Now'}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}
fetchTrackingData();
