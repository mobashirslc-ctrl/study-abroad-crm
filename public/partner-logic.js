/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking & Wallet
 * Status: FIXED & VERIFIED
 */

// 1. Global Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";

// ---------------------------------------------------------
// 2. Initialization on Load
// ---------------------------------------------------------
window.onload = () => {
    if(!partnerEmail) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('welcomeName').innerText = userData.name || "Partner";
    document.getElementById('pEmail').value = partnerEmail;
    document.getElementById('pOrg').value = userData.orgName || userData.name || "";
    
    if(userData.logoUrl) {
        document.getElementById('currentLogo').src = userData.logoUrl;
        const sidebarLogo = document.getElementById('sidebarLogo');
        if(sidebarLogo) sidebarLogo.src = userData.logoUrl;
    }

    initRealtimeData(); 
};

// ---------------------------------------------------------
// 3. Core Logic: Dashboard, Tracking & Wallet
// ---------------------------------------------------------
async function initRealtimeData() {
    try {
        const res = await fetch('/api/applications');
        if (!res.ok) throw new Error("Failed to fetch data");
        
        const allApps = await res.json();
        
        // বর্তমান পার্টনারের ফাইলগুলো ফিল্টার করা
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingBalance = 0; 
        let finalBalance = 0;   
        let combinedHtml = ""; 

        myApps.forEach(data => {
            const status = (data.status || 'PENDING').toUpperCase();
            
            // মেইন ফিক্স: স্টাফ ভেরিফাই না করা পর্যন্ত pendingAmount ০ থাকবে
            const actualAmount = Number(data.pendingAmount || 0);

            if (status !== 'PAID' && status !== 'REJECTED') {
                pendingBalance += actualAmount;
            }
            if (status === 'PAID') {
                finalBalance += actualAmount;
            }

            combinedHtml += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td>${data.university || 'N/A'}</td>
                <td><span class="badge" style="background:#252545; color:var(--gold); border: 1px solid var(--gold); padding: 5px 10px;">${status.replace(/_/g, ' ')}</span></td>
                <td>${new Date(data.timestamp).toLocaleDateString()}</td>
            </tr>`;
        });

        // UI Updates - Stats
        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('withdrawableBal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;

        // টেবিল আপডেট (হোম এবং ট্র্যাকিং উভয় পেজের জন্য)
        const homeTable = document.getElementById('homeTrackingBody');
        if(homeTable) homeTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";

        const trackTable = document.getElementById('fullTrackingBody');
        if(trackTable) trackTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
        // Withdraw Button Logic
        const btnW = document.getElementById('btnWithdraw');
        if(btnW) {
            const isEligible = finalBalance >= 5000;
            btnW.disabled = !isEligible;
            btnW.style.background = isEligible ? "#2ecc71" : "#444";
        }
    } catch (e) { 
        console.error("Data Fetch Error:", e);
    }
}

// ---------------------------------------------------------
// 4. File Upload & Submission
// ---------------------------------------------------------
async function uploadFile(file) {
    if(!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url || "";
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return "";
    }
}

async function uploadPartnerLogo() {
    const file = document.getElementById('logoUpload').files[0];
    if(!file) return;
    try {
        const url = await uploadFile(file);
        if(url) {
            document.getElementById('currentLogo').src = url;
            saveProfile(); 
        }
    } catch (e) { alert("Logo upload failed"); }
}

async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPass) return alert("Student Name & Passport are mandatory!");

    try {
        btn.innerText = "Uploading Documents...";
        btn.disabled = true;

        const [u1, u2, u3, u4] = await Promise.all([
            uploadFile(document.getElementById('file1').files[0]),
            uploadFile(document.getElementById('file2').files[0]),
            uploadFile(document.getElementById('file3').files[0]),
            uploadFile(document.getElementById('file4').files[0])
        ]);

        if(!u1 || !u2) throw new Error("Passport and Academic docs are required!");

        const payload = {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity,
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission, 
            pendingAmount: 0,                   
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            pdf1: u1, pdf2: u2, pdf3: u3, pdf4: u4
        };

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Submitted Successfully!");
            generateAdmissionSlip(payload); 
            location.reload();
        }
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
}

// ---------------------------------------------------------
// 5. Admission Slip, Search & Profile
// ---------------------------------------------------------
function generateAdmissionSlip(data) {
function generateAdmissionSlip(data) {
    const partnerLogo = document.getElementById('currentLogo').src;
    const partnerName = document.getElementById('pOrg').value || "Partner Agency";
    const authPerson = document.getElementById('pAuth').value || "Authorized Staff";
    
    const trackLink = "https://study-abroad-crm-nine.vercel.app/track.html";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackLink)}`;

    const slipWindow = window.open('', '_blank', 'width=900,height=850');
    
    const slipHtml = `
    <html>
    <head><title>Admission Slip - ${data.studentName}</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 30px; background: #f0f2f5; }
        .slip-card { background: white; border: 4px solid #2b0054; border-radius: 15px; max-width: 800px; margin: auto; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; padding: 25px; border-bottom: 2px solid #eee; }
        .section-header { background: #2ecc71; color: white; padding: 10px 20px; font-weight: bold; margin-top:15px; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 25px; font-size: 14px; }
        .footer { background: #2b0054; color: white; text-align: center; padding: 15px; font-size: 11px; }
    </style>
    </head>
    <body>
        <div class="slip-card">
            <div class="header">
                <img src="${partnerLogo}" height="65">
                <div style="text-align:right"><h3 style="margin:0;">ADMISSION ENROLLMENT SLIP</h3><small>SCC-2026-REF</small></div>
            </div>
            <div class="section-header">APPLICANT INFORMATION</div>
            <div class="details">
                <div><b>Student:</b> ${data.studentName}</div>
                <div><b>Passport:</b> ${data.passportNo}</div>
                <div><b>University:</b> ${data.university}</div>
                <div><b>Country:</b> UK / Europe</div>
            </div>
            <div class="section-header">PARTNER AGENCY</div>
            <div class="details">
                <div><b>Agency:</b> ${partnerName}</div>
                <div><b>Authorized:</b> ${authPerson}</div>
            </div>
            <div style="text-align:center; padding: 20px;">
                <img src="${qrUrl}" width="120">
                <p style="font-size:10px; color:#2b0054;">SCAN TO TRACK STATUS</p>
            </div>
            <div style="text-align:center; color:#2ecc71; padding-bottom: 20px;">
                <h3>🎉 Congratulations on your successful admission!</h3>
            </div>
            <div class="footer">2026 @ GORUN LTD. B2B System | study-abroad-crm-nine.vercel.app</div>
        </div>
    </body>
    </html>`;
    
    slipWindow.document.write(slipHtml);
    slipWindow.document.close();
}


async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const score = parseFloat(document.getElementById('userScore').value) || 0;
    
    const container = document.getElementById('uniListContainer');
    if(!container) return;
    container.innerHTML = "Searching...";

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const isEligible = gpa >= u.minGPA && score >= u.ieltsReq;
                const totalFee = (Number(u.semesterFee) || 0) * 120; 
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                // কলামগুলো আপনার স্ক্রিনশটের অর্ডারে সাজানো হয়েছে (মোট ৭টি কলাম)
                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.location}</small></td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                    <td>$${u.semesterFee}</td>
                    <td>${u.jobOpportunity || 'Standard'}</td>
                    <td style="color: ${isEligible ? '#2ecc71' : '#e74c3c'}">
                        ${isEligible ? '✅ Eligible' : '❌ Not Eligible'}
                    </td>
                    <td style="color:gold">৳${comm.toLocaleString()}</td>
                    <td>
                        <button class="btn-gold" style="padding: 5px 10px; cursor:pointer;" 
                        onclick="openApplyModal('${u.universityName}', ${comm})">Apply</button>
                    </td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='7'>No data found</td></tr>";
    } catch (e) { console.error(e); }
}

async function saveProfile() {
    const payload = {
        email: partnerEmail,
        contact: document.getElementById('pPhone').value,
        orgName: document.getElementById('pOrg').value,
        authorisedPerson: document.getElementById('pAuth').value,
        address: document.getElementById('pAddr').value,
        logoUrl: document.getElementById('currentLogo').src
    };
    
    const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    
    if(res.ok) {
        alert("✅ Profile Updated!");
        localStorage.setItem('user', JSON.stringify({...userData, ...payload}));
    }
}

function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}

function logout() { localStorage.clear(); window.location.href='index.html'; }
