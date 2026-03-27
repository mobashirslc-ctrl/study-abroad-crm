/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking & Wallet
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
    }

    initRealtimeData(); 
};

// ---------------------------------------------------------
// 3. Core Logic: Dashboard, Tracking & Wallet (FIXED)
// ---------------------------------------------------------
async function initRealtimeData() {
async function initRealtimeData() {
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingBalance = 0; 
        let finalBalance = 0;   
        let combinedHtml = ""; 

        myApps.forEach(data => {
            // স্ট্যাটাসকে বড় হাতের অক্ষরে রূপান্তর করে চেক করা (নিরাপত্তার জন্য)
            const status = (data.status || 'PENDING').toUpperCase();
            const comm = Number(data.commissionBDT || 0);

            // ১. পেন্ডিং ব্যালেন্স: যা এখনো পেইড হয়নি (PENDING, DOC_VERIFIED, VERIFIED সব এখানে আসবে)
            if (status !== 'PAID' && status !== 'REJECTED') {
                pendingBalance += comm;
            }
            
            // ২. ফাইনাল ব্যালেন্স: যা এডমিন অলরেডি পে করে দিয়েছে
            if (status === 'PAID') {
                finalBalance += comm;
            }

            combinedHtml += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td>${data.university || 'N/A'}</td>
                <td><span class="badge" style="background:#252545; color:var(--gold); border: 1px solid var(--gold); padding: 5px 10px;">${status.replace(/_/g, ' ')}</span></td>
                <td>${new Date(data.timestamp).toLocaleDateString()}</td>
            </tr>`;
        });

        // UI Updates
        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('withdrawableBal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;

        // ড্যাশবোর্ড টেবিল আপডেট
        const homeTable = document.getElementById('homeTrackingBody');
        if(homeTable) homeTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";

        // ট্র্যাকিং টেবিল আপডেট (ID সংশোধিত: fullTrackingBody)
        const trackTable = document.getElementById('fullTrackingBody');
        if(trackTable) trackTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
        // Withdraw Button Logic
        const btnW = document.getElementById('btnWithdraw');
        if(btnW) {
            btnW.disabled = finalBalance < 5000;
            btnW.style.background = finalBalance >= 5000 ? "#2ecc71" : "#444";
        }
    } catch (e) { console.error("Data Fetch Error:", e); }
}

        // UI Updates - Stats
        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('withdrawableBal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;

        // FIX: হোম ড্যাশবোর্ড টেবিল আপডেট
        const homeTable = document.getElementById('homeTrackingBody');
        if(homeTable) homeTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";

        // FIX: ট্র্যাকিং ট্যাব টেবিল আপডেট (যা আগে ব্ল্যাঙ্ক ছিল)
        const trackTable = document.getElementById('trackingTableBody');
        if(trackTable) trackTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
        // Withdraw Button Activation (Min 5000 BDT)
        const btnW = document.getElementById('btnWithdraw');
        if(btnW) {
            if(finalBalance >= 5000) {
                btnW.disabled = false;
                btnW.style.background = "#2ecc71"; // Green
            } else {
                btnW.disabled = true;
                btnW.style.background = "#ccc";
            }
        }
    } catch (e) { console.error("Data Fetch Error:", e); }
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
            pdf1: u1, pdf2: u2, pdf3: u3, pdf4: u4,
            status: 'PENDING',
            timestamp: new Date().toISOString()
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
// 5. Admission Slip & Profile
// ---------------------------------------------------------
function generateAdmissionSlip(data) {
    const partnerLogo = document.getElementById('currentLogo').src;
    const partnerName = document.getElementById('pOrg').value || "Partner Agency";
    const authPerson = document.getElementById('pAuth').value || "Authorized Staff";
    
    const trackLink = "https://study-abroad-crm-nine.vercel.app/track.html";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackLink)}`;

    const slipWindow = window.open('', '_blank', 'width=900,height=850');
    
    const slipHtml = `
    <html>
    <head>
        <title>Admission Slip - ${data.studentName}</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 30px; background: #f0f2f5; }
            .slip-card { background: white; border: 4px solid #2b0054; border-radius: 15px; max-width: 800px; margin: auto; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; align-items: center; padding: 25px; border-bottom: 2px solid #eee; }
            .section-header { background: #2ecc71; color: white; padding: 10px 20px; font-weight: bold; margin: 20px 0 10px 0; font-size: 14px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 10px 25px; font-size: 14px; }
            .tracking-wrap { display: flex; align-items: center; justify-content: center; gap: 50px; padding: 30px; background: #fafafa; border-top: 1px solid #eee; }
            .status-stamp { background: #2ecc71; color: white; padding: 15px 35px; border-radius: 12px; text-align: center; }
            .footer { background: #2b0054; color: white; text-align: center; padding: 15px; font-size: 11px; }
            @media print { .no-print { display: none; } body { padding: 0; } .slip-card { border: 2px solid #2b0054; box-shadow: none; } }
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align:center; margin-bottom:15px;"><button onclick="window.print()">PRINT SLIP / PDF</button></div>
        <div class="slip-card">
            <div class="header">
                <img src="${partnerLogo}" height="65">
                <div style="text-align:right">
                    <h3 style="margin:0; color:#2b0054;">ADMISSION ENROLLMENT SLIP</h3>
                    <small>REF: SCC-2026-${Math.floor(Math.random()*90000)}</small>
                </div>
            </div>
            <div class="section-header">APPLICANT INFORMATION</div>
            <div class="details">
                <div><b>Student Name:</b> ${data.studentName}</div>
                <div><b>Passport No:</b> ${data.passportNo}</div>
                <div><b>Target Country:</b> United Kingdom (UK)</div>
                <div><b>University:</b> ${data.university}</div>
            </div>
            <div class="section-header">PARTNER AGENCY</div>
            <div class="details">
                <div><b>Agency Name:</b> ${partnerName}</div>
                <div><b>Authorized Person:</b> ${authPerson}</div>
            </div>
            <div class="tracking-wrap">
                <div style="text-align:center">
                    <img src="${qrUrl}" width="120">
                    <p style="font-size:10px; font-weight:bold; margin-top:5px; color:#2b0054;">SCAN TO TRACK STATUS</p>
                </div>
                <div class="status-stamp">
                    <div style="font-size:22px; font-weight:bold;">VERIFIED</div>
                    <div style="font-size:11px;">B2B PROCESSING SYSTEM</div>
                </div>
            </div>
            <div style="text-align:center; color:#2ecc71;"><h3>🎉 Congratulations on your successful admission!</h3></div>
            <div class="footer">2026 @ Rights & Reserved GORUN LTD | study-abroad-crm-nine.vercel.app</div>
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

                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.location}</small></td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                    <td>$${u.semesterFee}</td>
                    <td>${u.jobOpportunity || 'Standard'}</td>
                    <td>${isEligible ? '✅ Eligible' : '❌ Not Eligible'}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', ${comm})">Apply</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html;
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
    
    if(res.ok) alert("✅ Profile Updated Successfully!");
}

function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}

function logout() { localStorage.clear(); window.location.href='index.html'; }
