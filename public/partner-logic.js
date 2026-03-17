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
            const bdtTotal = fee * 120;
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
                    </td>
                    <td>
                        <button class="btn-gold" onclick="openApplyModal('${u.universityName}')">Apply</button>
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

// --- ৫. সাবমিট অ্যাপ্লিকেশন ---
document.getElementById('submitAppBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitAppBtn');
    
    const name = document.getElementById('sName').value;
    const passNum = document.getElementById('sPass').value;
    const phone = document.getElementById('sPhone').value;
    const uni = document.getElementById('sUni').value;
    const partnerName = localStorage.getItem('partnerName') || "Partner";

    const filePass = document.getElementById('filePassport').files[0];
    const fileAcad = document.getElementById('fileAcademic').files[0];
    const fileLang = document.getElementById('fileLanguage').files[0];
    const fileOther = document.getElementById('fileOthers').files[0];

    if (!name || !passNum || !filePass || !fileAcad) {
        return alert("Mandatory: Name, Passport, and Academic Docs!");
    }

    try {
        btn.innerText = "Uploading Files..."; btn.disabled = true;

        const [urlPass, urlAcad, urlLang, urlOther] = await Promise.all([
            uploadToCloudinary(filePass),
            uploadToCloudinary(fileAcad),
            uploadToCloudinary(fileLang),
            uploadToCloudinary(fileOther)
        ]);

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
            status: "Pending",
            createdAt: serverTimestamp()
        });

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
        btn.innerText = "Confirm & Submit"; 
        btn.disabled = false; 
    }
});

// --- ৬. ট্র্যাকিং লিস্ট (৪টি ফাইল আইকন সিস্টেম - FIXED) ---
async function fetchTrackingData() {
    const trackTable = document.getElementById('trackingBody');
    if(!trackTable) return;
    try {
        const snap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        trackTable.innerHTML = "";
        snap.forEach((docSnap) => {
            const app = docSnap.data();
            const docs = app.docs || {};
            
            // Cloudinary PDF Attachment Fix
            const getUrl = (url) => url ? url.replace("upload/", "upload/fl_attachment,f_auto/") : null;

            trackTable.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.contactNo}</td>
                    <td>${app.passportNumber}</td>
                    <td><span style="background:var(--gold); color:black; padding:2px 8px; border-radius:5px; font-size:11px; font-weight:bold;">${app.status}</span></td>
                    <td style="display: flex; gap: 10px; font-size: 16px;">
                        ${docs.passport ? `<a href="${getUrl(docs.passport)}" target="_blank" title="Passport" style="color:var(--gold);"><i class="fas fa-id-card"></i></a>` : ''}
                        ${docs.academic ? `<a href="${getUrl(docs.academic)}" target="_blank" title="Academic" style="color:#2ecc71;"><i class="fas fa-graduation-cap"></i></a>` : ''}
                        ${docs.language ? `<a href="${getUrl(docs.language)}" target="_blank" title="Language" style="color:#3498db;"><i class="fas fa-language"></i></a>` : ''}
                        ${docs.others ? `<a href="${getUrl(docs.others)}" target="_blank" title="Others" style="color:#9b59b6;"><i class="fas fa-file-alt"></i></a>` : ''}
                    </td>
                    <td>${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'Now'}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}
fetchTrackingData();
