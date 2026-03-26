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

// ২. ড্যাশবোর্ড ডাটা লোড (Real-time Wallet & Short Table)
export async function initRealtimeData() {
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => app.partnerEmail === partnerEmail);

        let pendingComm = 0;
        let finalBal = 0;
        let tableHTML = "";

        myApps.forEach(data => {
            pendingComm += Number(data.pendingAmount || 0);
            finalBal += Number(data.finalAmount || 0);

            tableHTML += `
                <tr>
                    <td>${data.studentName}</td>
                    <td><span style="color:${getStatusColor(data.status)}">${data.status}</span></td>
                    <td>${data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'Just now'}</td>
                    <td>
                        <button class="btn-view" onclick='printAdmissionSlip(${JSON.stringify(data)})'>
                            <i class="fas fa-print"></i> Slip
                        </button>
                    </td>
                </tr>`;
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

// ৩. ইউনিভার্সিটি সার্চ এবং এলিজিবিলিটি অ্যাসেসমেন্ট (Assessment Logic)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value.trim();
    
    // Assessment Inputs (HTML-এ এই আইডিগুলো থাকতে হবে)
    const userGPA = parseFloat(document.getElementById('userGPA')?.value) || 0;
    const userIELTS = parseFloat(document.getElementById('userIELTS')?.value) || 0;

    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const res = await fetch('/api/universities');
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
                const minGPA = parseFloat(u.minGPA) || 0;
                const ieltsReq = parseFloat(u.ieltsReq) || 0;
                
                // Eligibility Logic
                const isEligible = (userGPA >= minGPA) && (userIELTS >= ieltsReq);
                const totalFee = (Number(u.semesterFee) || 0) * 120; 
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                html += `
                <tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.minGPA} / ${u.ieltsReq}</td>
                    <td>
                        <span style="color:${isEligible ? '#2ecc71' : '#ff4757'}; font-weight:bold;">
                            ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                        </span>
                    </td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${comm.toLocaleString()}</td>
                    <td>
                        <button class="btn-gold" ${!isEligible ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
                            onclick="openApplyModal('${u.universityName}', ${comm})">APPLY</button>
                    </td>
                </tr>`;
            }
        });
        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No university found!</td></tr>";
    } catch (e) {
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Database Error!</td></tr>";
    }
}

// ৪. অ্যাডমিশন স্লিপ জেনারেশন (Print Logic)
window.printAdmissionSlip = (appData) => {
    const partnerData = JSON.parse(localStorage.getItem('user') || "{}");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Admission Slip - ${appData.studentName}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                    .slip { border: 5px double #2b0054; padding: 30px; border-radius: 10px; position: relative; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1c40f; padding-bottom: 20px; }
                    .logo { max-width: 120px; height: auto; border-radius: 5px; }
                    .content { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                    .box { background: #f4f4f9; padding: 15px; border-radius: 5px; border-left: 5px solid #2b0054; }
                    .footer { margin-top: 50px; text-align: right; }
                    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.05); z-index: -1; white-space: nowrap; }
                </style>
            </head>
            <body>
                <div class="slip">
                    <div class="watermark">SCC VERIFIED</div>
                    <div class="header">
                        <img src="${partnerData.logoURL || 'logo.jpeg'}" class="logo" onerror="this.src='https://via.placeholder.com/150?text=SCC+Partner'">
                        <div style="text-align:right">
                            <h2 style="color:#2b0054; margin:0;">ADMISSION ACKNOWLEDGEMENT</h2>
                            <p style="margin:5px 0;">Tracking ID: <b>SCC-${appData._id ? appData._id.slice(-6).toUpperCase() : 'NEW'}</b></p>
                        </div>
                    </div>
                    <h1 style="text-align:center; color:#2ecc71; margin-top:30px;">SUCCESSFULLY FILED</h1>
                    <div class="content">
                        <div class="box">
                            <h3 style="margin-top:0; color:#2b0054;">STUDENT INFO</h3>
                            <p><b>Name:</b> ${appData.studentName}</p>
                            <p><b>Passport:</b> ${appData.passportNo}</p>
                            <p><b>University:</b> ${appData.university}</p>
                        </div>
                        <div class="box">
                            <h3 style="margin-top:0; color:#2b0054;">AGENCY INFO</h3>
                            <p><b>Agency:</b> ${partnerData.fullName || 'Registered Partner'}</p>
                            <p><b>Email:</b> ${partnerData.email}</p>
                            <p><b>Contact:</b> ${partnerData.contact || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Issued Date: ${new Date().toLocaleDateString()}</p>
                        <br><br>
                        <p>__________________________</p>
                        <p>Authorized Signature & Stamp</p>
                    </div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
};

// ৫. লাইভ ট্র্যাকিং ট্যাব ডাটা (Full History)
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
                    <td><span style="color:${getStatusColor(data.status)}">${data.status}</span></td>
                    <td>${data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A'}</td>
                    <td><button class="btn-view" onclick='printAdmissionSlip(${JSON.stringify(data)})'>Slip</button></td>
                </tr>`;
        });
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = html || "<tr><td colspan='6'>No records found</td></tr>";
    } catch (err) {
        console.error("Tracking Load Error:", err);
    }
}

// ৬. অ্যাপ্লিকেশন সাবমিট (With File Upload)
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Student name and passport are required!");

    const btn = document.querySelector('#applyModal .btn-gold');
    const originalText = btn.innerText;
    btn.innerText = "Processing... ⏳";
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
            pendingAmount: currentUniCommission, // Initial pending balance
            pdf1: urls[0] || "", 
            pdf2: urls[1] || "", 
            pdf3: urls[2] || "", 
            pdf4: urls[3] || "", 
            status: "PENDING",
            timestamp: new Date()
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
        }
    } catch (e) {
        alert("Submission failed.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// হেল্পার ফাংশন: স্ট্যাটাস কালার
function getStatusColor(status) {
    const s = status ? status.toUpperCase() : "PENDING";
    if(s === "PENDING") return "#f1c40f";
    if(s === "APPROVED" || s === "VERIFIED" || s === "PAID") return "#2ecc71";
    if(s === "REJECTED") return "#e74c3c";
    return "#fff";
}

// হেল্পার ফাংশন: ক্লাউডিনারি আপলোড
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

// ৭. প্রোফাইল এবং পেআউট (সংক্ষিপ্ত)
export async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    const logoFile = document.getElementById('pLogo').files[0];
    const btn = document.querySelector('#profile .btn-gold');
    btn.innerText = "Saving...";
    try {
        let logoURL = userData.logoURL || "";
        if (logoFile) logoURL = await uploadFile(logoFile);
        const res = await fetch('/api/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, contact, logoURL })
        });
        if (res.ok) {
            localStorage.setItem('user', JSON.stringify({ ...userData, contact, logoURL }));
            alert("Profile Updated!");
        }
    } catch (e) { alert("Update failed"); }
    btn.innerText = "Save Profile";
}

export async function requestWithdraw() {
    const amount = document.getElementById('wdAmount').value;
    const details = document.getElementById('wdDetails').value;
    if(!amount || amount <= 0) return alert("Enter valid amount");
    try {
        const res = await fetch('/api/withdrawals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerEmail, amount: Number(amount), method: document.getElementById('wdMethod').value, details })
        });
        if (res.ok) alert("Withdrawal request submitted!");
    } catch (e) { }
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
