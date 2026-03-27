/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking & Wallet
 * Status: FINAL VERIFIED & OPTIMIZED
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
// 3. Core Logic: Dashboard & Wallet Tracking (FINAL FIXED)
// ---------------------------------------------------------
async function initRealtimeData() {
    try {
        // ১. লেটেস্ট ইউজার ডাটা (ব্যালেন্স) সার্ভার থেকে নিয়ে আসা
        // লগইন করার পর ডাটাবেস থেকে ফ্রেশ ব্যালেন্স নিতে এই কলটি জরুরি
        const userRes = await fetch('/api/admin/users'); // অথবা প্রোফাইল দেখার নির্দিষ্ট API
        const allUsers = await userRes.json();
        const currentMe = allUsers.find(u => u.email.toLowerCase().trim() === partnerEmail);
        
        // যদি ডাটাবেসে ইউজার পাওয়া যায়, তবে ব্যালেন্স আপডেট করুন
        const currentAvailable = currentMe ? (currentMe.walletBalance || 0) : 0;

        // ২. অ্যাপ্লিকেশন ডাটা নিয়ে আসা (পেন্ডিং ব্যালেন্সের জন্য)
        const res = await fetch('/api/applications');
        if (!res.ok) throw new Error("Failed to fetch applications");
        
        const allApps = await res.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingTotal = 0; 
        let combinedHtml = ""; 

        myApps.forEach(data => {
            const status = (data.status || 'PENDING').toUpperCase();
            const pAmount = Number(data.pendingAmount || 0);
            
            pendingTotal += pAmount; // শুধু pendingAmount ফিল্ড থেকে যোগ হবে

            combinedHtml += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td>${data.university || 'N/A'}</td>
                <td><span class="badge" style="background:#252545; color:var(--gold); border: 1px solid var(--gold); padding: 5px 10px;">${status.replace(/_/g, ' ')}</span></td>
                <td>${new Date(data.timestamp).toLocaleDateString()}</td>
            </tr>`;
        });

        // ৩. UI আপডেট (Available Balance এখন ডাটাবেস থেকে আসছে)
        document.getElementById('topPending').innerText = `৳${pendingTotal.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${currentAvailable.toLocaleString()}`;
        document.getElementById('withdrawableBal').innerText = `৳${currentAvailable.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;

        const homeTable = document.getElementById('homeTrackingBody');
        if(homeTable) homeTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";

        const trackTable = document.getElementById('fullTrackingBody');
        if(trackTable) trackTable.innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
        const btnW = document.getElementById('btnWithdraw');
        if(btnW) {
            const isEligible = currentAvailable >= 5000;
            btnW.disabled = !isEligible;
            btnW.style.background = isEligible ? "#2ecc71" : "#444";
        }
    } catch (e) { console.error("Data Fetch Error:", e); }
}



// ---------------------------------------------------------
// 4. File Handling & Submissions
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
    } catch (e) { return ""; }
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
    } catch (e) { alert("Error: " + e.message); } 
    finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
}

// ---------------------------------------------------------
// 5. Admission Slip, Search & Profiles
// ---------------------------------------------------------
// 5. Admission Slip (Fixed with Auto-Print & PDF Support)
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
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #fff; }
            .no-print { text-align: center; margin-bottom: 20px; }
            .btn-print { background: #2ecc71; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px; font-weight: bold; }
            .slip-card { border: 2px solid #2b0054; border-radius: 15px; max-width: 800px; margin: auto; overflow: hidden; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #eee; }
            .section-header { background: #2ecc71; color: white; padding: 8px 15px; font-weight: bold; font-size: 14px; margin-top: 10px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 20px; font-size: 14px; }
            .qr-area { text-align: center; padding: 15px; background: #f9f9f9; border-top: 1px solid #eee; }
            .footer { background: #2b0054; color: white; text-align: center; padding: 10px; font-size: 11px; }
            
            /* Print Optimization */
            @media print {
                .no-print { display: none; }
                body { padding: 0; }
                .slip-card { border: 1px solid #2b0054; box-shadow: none; width: 100%; margin: 0; }
                @page { margin: 0.5cm; }
            }
        </style>
    </head>
    <body onload="setTimeout(() => { window.print(); }, 500)">
        <div class="no-print">
            <button class="btn-print" onclick="window.print()">SAVE AS PDF / PRINT</button>
            <p style="font-size: 12px; color: #666;">If the print window doesn't open, click the button above.</p>
        </div>
        
        <div class="slip-card">
            <div class="header">
                <img src="${partnerLogo}" height="60">
                <div style="text-align:right">
                    <h3 style="margin:0; color:#2b0054;">ADMISSION ENROLLMENT SLIP</h3>
                    <small style="color: #666;">REF: SCC-2026-${Math.floor(Math.random()*90000)}</small>
                </div>
            </div>

            <div class="section-header">STUDENT INFORMATION</div>
            <div class="details">
                <div><b>Student Name:</b> ${data.studentName}</div>
                <div><b>Passport No:</b> ${data.passportNo}</div>
                <div><b>Target Country:</b> United Kingdom (UK)</div>
                <div><b>University:</b> ${data.university}</div>
            </div>

            <div class="section-header">PARTNER AGENCY DETAILS</div>
            <div class="details">
                <div><b>Agency Name:</b> ${partnerName}</div>
                <div><b>Authorized Person:</b> ${authPerson}</div>
                <div><b>Partner Email:</b> ${partnerEmail}</div>
            </div>

            <div class="qr-area">
                <img src="${qrUrl}" width="100">
                <p style="font-size:10px; margin-top:5px; color:#2b0054; font-weight: bold;">SCAN TO TRACK STUDENT STATUS</p>
                <div style="margin-top: 10px; color: #2ecc71;">
                    <h3 style="margin: 0;">🎉 Congratulations!</h3>
                    <p style="font-size: 11px; color: #666; margin: 2px 0;">We wish you a successful journey ahead.</p>
                </div>
            </div>

            <div class="footer">
                2026 @ GORUN LTD. | Study Abroad B2B Division | Powered by SCC Group
            </div>
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
                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.location}</small></td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                    <td>$${u.semesterFee}</td>
                    <td>${u.jobOpportunity || 'Standard'}</td>
                    <td style="color: ${isEligible ? '#2ecc71' : '#e74c3c'}">${isEligible ? '✅ Eligible' : '❌ Not Eligible'}</td>
                    <td style="color:gold">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" style="padding: 5px 10px; cursor:pointer;" onclick="openApplyModal('${u.universityName}', ${comm})">Apply</button></td>
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
