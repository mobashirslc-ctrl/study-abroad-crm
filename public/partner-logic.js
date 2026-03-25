import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ১. সেশন চেক এবং গ্লোবাল ভেরিয়েবল
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = userData.email ? userData.email.toLowerCase().trim() : null;

if (!partnerEmail) {
    console.error("No valid session. Redirecting...");
    window.location.href = 'index.html';
}

let currentUniCommission = 0;
let selectedUniversity = "";

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

// ২. রিয়েল-টাইম ডাটা লোড (Dashboard)
export function initRealtimeData() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    
    onSnapshot(q, (snapshot) => {
        let pendingComm = 0;
        let finalBal = 0;
        let tableHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            // কমিশন ক্যালকুলেশন (যদি স্ট্যাটাস PAID হয় তবে ব্যালেন্সে যাবে)
            if (data.status === "PAID") {
                finalBal += Number(data.commissionBDT || 0);
            } else {
                pendingComm += Number(data.commissionBDT || 0);
            }

            // রিসেন্ট অ্যাক্টিভিটি টেবিল জেনারেট
            tableHTML += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNo}</td>
                    <td><span style="color:${getStatusColor(data.status)}">${data.status}</span></td>
                    <td>${data.submittedAt ? new Date(data.submittedAt.seconds * 1000).toLocaleDateString() : 'Just now'}</td>
                </tr>
            `;
        });

        // UI আপডেট
        if(document.getElementById('topPending')) document.getElementById('topPending').innerText = `৳${pendingComm.toLocaleString()}`;
        if(document.getElementById('topFinal')) document.getElementById('topFinal').innerText = `৳${finalBal.toLocaleString()}`;
        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = tableHTML;
        if(document.getElementById('withdrawFinalBalance')) document.getElementById('withdrawFinalBalance').innerText = `৳${finalBal.toLocaleString()}`;
    });
}

// ৩. লাইভ ট্র্যাকিং ট্যাব ডাটা
export function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <tr>
                    <td><b>${data.studentName}</b><br><small>${data.university}</small></td>
                    <td>${data.handledBy || "Processing..."}</td>
                    <td>${data.passportNo}</td>
                    <td>${data.status === "PENDING" ? "Checking..." : "Verified"}</td>
                    <td><span style="padding:4px 8px; border-radius:4px; background:rgba(241, 196, 15, 0.1); color:#f1c40f">${data.status}</span></td>
                    <td>${data.submittedAt ? new Date(data.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `;
        });
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = html;
    });
}

function getStatusColor(status) {
    if(status === "PENDING") return "#f1c40f";
    if(status === "APPROVED") return "#2ecc71";
    if(status === "REJECTED") return "#e74c3c";
    return "#fff";
}

// ৪. ইউনিভার্সিটি সার্চ লজিক
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
                const totalFee = (u.semesterFee || 0) * 120; // Example conversion
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
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Database Error!</td></tr>";
    }
}

// ৫. ফাইল আপলোড এবং সাবমিশন
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
    } catch (e) { return null; }
}

export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Student name and passport are required!");

    const btn = document.querySelector('#applyModal .btn-gold');
    const originalText = btn.innerText;
    btn.innerText = "Uploading Files... ⏳";
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
    } catch (e) {
        alert("Submission failed.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// ৬. মডাল ফাংশন (Global Scope)
window.openApplyModal = (uniName, commission) => {
    selectedUniversity = uniName;
    currentUniCommission = commission;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('applyModal').style.display = 'none';
};

export async function updateProfile() {
    alert("Profile update feature coming soon with Firebase Auth!");
}

export async function requestWithdraw() {
    const amount = document.getElementById('wdAmount').value;
    if(!amount || amount <= 0) return alert("Enter valid amount");
    alert(`Withdrawal request for ৳${amount} submitted!`);
}