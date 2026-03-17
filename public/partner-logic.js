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

// --- ৩. ইউনিভার্সিটি লিস্ট লোড (ডিজাইন ফিক্সড) ---
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
            const bdtTotal = fee * 120; // Exchange Rate: 120
            const comm = (bdtTotal * Number(u.partnerComm || 0)) / 100;

            uniTable.innerHTML += `
                <tr>
                    <td>
                        <div style="font-weight: bold; color: #fff;">${u.universityName}</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5);">${u.courseName}</div>
                    </td>
                    <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px;">${u.country}</span></td>
                    <td>${u.intake || 'All'}</td>
                    <td>
                        <div style="font-weight: bold;">$${fee.toLocaleString()}</div>
                        <div style="font-size: 10px; opacity: 0.6;">৳ ${bdtTotal.toLocaleString()}</div>
                    </td>
                    <td style="color: #2ecc71; font-weight: bold;">
                        ৳ ${comm.toLocaleString()}
                        <div style="font-size: 9px; color: rgba(255,255,255,0.4);">Comm: ${u.partnerComm}%</div>
                    </td>
                    <td>
                        <button class="btn-gold" onclick="openApplyModal('${u.universityName}')">Apply Now</button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error("Load Error:", e); }
}

window.openApplyModal = (u) => {
    const modalInput = document.getElementById('sUni');
    if(modalInput) modalInput.value = u;
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
        btn.innerText = "Uploading Files..."; btn.disabled = true;

        // ৪টি ফাইল প্যারালাল আপলোড
        const [urlPass, urlAcad, urlLang, urlOther] = await Promise.all([
            uploadToCloudinary(filePass),
            uploadToCloudinary(fileAcad),
            uploadToCloudinary(fileLang),
            uploadToCloudinary(fileOther)
        ]);

        btn.innerText = "Securing Data...";
        
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

        // সফল হলে স্লিপ দেখানো (এটি HTML এর showSuccessSlip ফাংশনকে কল করবে)
        if(typeof window.showSuccessSlip === "function") {
            window.showSuccessSlip({
                id: docRef.id,
                studentName: name,
                passport: passNum,
                partner: partnerName,
                university: uni
            });
        } else {
            alert("Success! Slip function not found but data saved.");
            location.reload();
        }

    } catch (e) { 
        alert("Error: " + e.message); 
        btn.innerText = "Submit Application"; 
        btn.disabled = false; 
    }
});

// --- ৬. ট্র্যাকিং লিস্ট (৪টি ফাইলের লিঙ্কসহ) ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;
    try {
        const snap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";
        snap.forEach((docSnap) => {
            const app = docSnap.data();
            
            // Cloudinary PDF Force Download Fix (fl_attachment)
            const getSecureUrl = (url) => url ? url.replace("upload/", "upload/fl_attachment,f_auto/") : "#";

            trackTable.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:#f1c40f; color:black; padding:2px 8px; border-radius:5px; font-size:11px; font-weight:bold;">${app.status}</span></td>
                    <td>Pending</td>
                    <td>
                        <a href="${getSecureUrl(app.docs?.passport)}" target="_blank" style="color:var(--gold); font-size:12px; font-weight:bold; text-decoration:none;">
                           <i class="fas fa-file-pdf"></i> View Doc
                        </a>
                    </td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Just Now'}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}
fetchTrackingData();
