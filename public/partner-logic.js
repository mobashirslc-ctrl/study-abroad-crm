// ১. সেশন চেক এবং গ্লোবাল ভেরিয়েবল
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = userData.email ? userData.email.toLowerCase().trim() : null;

if (!partnerEmail) {
    console.error("No valid session. Redirecting...");
    window.location.href = 'index.html';
}

let currentUniCommission = 0;
let selectedUniversity = "";

// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

// ২. রিয়েল-টাইম ডাটা লোড (Dashboard) - MongoDB API থেকে
export async function initRealtimeData() {
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => app.partnerEmail === partnerEmail);

        let pendingComm = 0;
        let finalBal = 0;
        let tableHTML = "";

        myApps.forEach(data => {
            // ওয়ালেট ক্যালকুলেশন (index.js এর ফিল্ড অনুযায়ী)
            pendingComm += Number(data.pendingAmount || 0);
            finalBal += Number(data.finalAmount || 0);

            tableHTML += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNo}</td>
                    <td><span style="color:${getStatusColor(data.status)}">${data.status}</span></td>
                    <td>${data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Just now'}</td>
                </tr>
            `;
        });

        if(document.getElementById('topPending')) document.getElementById('topPending').innerText = `৳${pendingComm.toLocaleString()}`;
        if(document.getElementById('topFinal')) document.getElementById('topFinal').innerText = `৳${finalBal.toLocaleString()}`;
        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = tableHTML || "<tr><td colspan='4'>No data found</td></tr>";
        if(document.getElementById('withdrawFinalBalance')) document.getElementById('withdrawFinalBalance').innerText = `৳${finalBal.toLocaleString()}`;
        
        const wdBtn = document.getElementById('requestWdBtn');
        if(wdBtn) wdBtn.disabled = finalBal <= 0;
    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

// ৩. লাইভ ট্র্যাকিং ট্যাব ডাটা
export async function initTracking() {
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => app.partnerEmail === partnerEmail);

        let html = "";
        myApps.forEach(data => {
            html += `
                <tr>
                    <td><b>${data.studentName}</b><br><small>${data.university}</small></td>
                    <td>${data.complianceMember || "Processing..."}</td>
                    <td>${data.passportNo}</td>
                    <td>${data.status === "PENDING" ? "Checking..." : "Verified"}</td>
                    <td><span style="padding:4px 8px; border-radius:4px; background:rgba(241, 196, 15, 0.1); color:#f1c40f">${data.status}</span></td>
                    <td>${data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `;
        });
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = html || "<tr><td colspan='6'>No records found</td></tr>";
    } catch (err) {
        console.error("Tracking Load Error:", err);
    }
}

function getStatusColor(status) {
    const s = status ? status.toUpperCase() : "PENDING";
    if(s === "PENDING") return "#f1c40f";
    if(s === "APPROVED" || s === "VERIFIED" || s === "PAID") return "#2ecc71";
    if(s === "REJECTED") return "#e74c3c";
    return "#fff";
}

// ৪. ইউনিভার্সিটি সার্চ লজিক (API থেকে)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value.trim();
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const res = await fetch('/api/universities'); // আপনি MongoDB-তে ইউনিভার্সিটিগুলো সেভ করলে এই API লাগবে
        const universities = await res.json();
        
        let html = "";
        let found = false;

        universities.forEach(u => {
            const dbDegree = u.degree ? u.degree.trim() : "";
            const dbCountry = u.country ? u.country.toLowerCase().trim() : "";

            const matchCountry = !countryInput || dbCountry.includes(countryInput);
            const matchDegree = !degreeInput || (dbDegree === degreeInput);

            if (matchCountry && matchDegree) {
                found = true;
                const totalFee = (Number(u.semesterFee) || 0) * 120; 
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

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
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Database Error!</td></tr>";
    }
}

// ৫. ফাইল আপলোড লজিক (Cloudinary)
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

// ৬. অ্যাপ্লিকেশন সাবমিট (MongoDB API)
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
        const uploadPromises = fileIds.map(id => {
            const el = document.getElementById(id);
            return el && el.files[0] ? uploadFile(el.files[0]) : null;
        });
        const urls = await Promise.all(uploadPromises);

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity,
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission,
            pdf1: urls[0] || "", 
            pdf2: urls[1] || "", 
            pdf3: urls[2] || "", 
            pdf4: urls[3] || "", 
            status: "PENDING"
        };

        const response = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });

        if (response.ok) {
            alert("✅ Application Submitted Successfully!");
            window.closeModal();
            initRealtimeData();
        } else {
            alert("Submission failed on server.");
        }
    } catch (e) {
        alert("Submission failed.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// ৭. প্রোফাইল আপডেট (MongoDB API)
export async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    const logoFile = document.getElementById('pLogo').files[0];
    
    const btn = document.querySelector('#profile .btn-gold');
    btn.innerText = "Saving... ⏳";
    btn.disabled = true;

    try {
        let logoURL = userData.logoURL || "";
        if (logoFile) {
            logoURL = await uploadFile(logoFile);
        }

        const response = await fetch('/api/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, contact, logoURL })
        });

        if (response.ok) {
            const updatedUser = { ...userData, contact, logoURL };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            if(logoURL) document.getElementById('slipPartnerLogo').src = logoURL;
            alert("✅ Agency Profile Updated!");
        }
    } catch (error) {
        alert("❌ Profile update failed.");
    } finally {
        btn.innerText = "Save Profile";
        btn.disabled = false;
    }
}

// ৮. পেআউট রিকোয়েস্ট
export async function requestWithdraw() {
    const amount = document.getElementById('wdAmount').value;
    const method = document.getElementById('wdMethod').value;
    const details = document.getElementById('wdDetails').value;

    if(!amount || amount <= 0) return alert("Enter valid amount");
    if(!details) return alert("Enter payment details");

    try {
        const response = await fetch('/api/withdrawals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerEmail, amount: Number(amount), method, details })
        });

        if (response.ok) {
            alert(`Withdrawal request for ৳${amount} submitted!`);
            document.getElementById('wdAmount').value = "";
            document.getElementById('wdDetails').value = "";
        }
    } catch (e) {
        alert("Withdrawal request failed.");
    }
}

// গ্লোবাল উইন্ডো ফাংশন
window.openApplyModal = (uniName, commission) => {
    selectedUniversity = uniName;
    currentUniCommission = commission;
    document.getElementById('modalTitle').innerText = "Apply for " + uniName;
    document.getElementById('applyModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('applyModal').style.display = 'none';
};