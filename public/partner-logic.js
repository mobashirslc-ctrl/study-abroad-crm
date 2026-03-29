/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Full Compatibility with provided HTML
 */

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let partnerLogoBase64 = userData.logoUrl || null;
let selectedUniversity = "";
let currentUniCommission = 0; 
let currentAvailableBalance = 0; 

// --- 1. Initialization ---
window.onload = () => {
    // UI Initial Values
    if(document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.name || "Partner";
    if(document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;
    
    // Fill profile fields
    const fields = { 'pOrg': 'orgName', 'pAuth': 'authorisedPerson', 'pPhone': 'contact', 'pAddr': 'address' };
    for (let id in fields) {
        if(document.getElementById(id)) document.getElementById(id).value = userData[fields[id]] || "";
    }

    // --- লোগো ফিক্স এখানে ---
    if(userData.logoUrl) {
        // ১. গ্লোবাল ভেরিয়েবল আপডেট (এটি স্লিপ জেনারেশনের জন্য জরুরি)
        partnerLogoBase64 = userData.logoUrl; 
        
        // ২. UI ইমেজ আপডেট
        if(document.getElementById('currentLogo')) {
            document.getElementById('currentLogo').src = userData.logoUrl;
        }
    }

    initRealtimeData(); 
    searchUni(); // Initial Load
};

// --- 2. Realtime Data & Wallet ---
async function initRealtimeData() {
    try {
        const [userRes, appRes] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/applications')
        ]);
        
        const allUsers = await userRes.json();
        const me = allUsers.find(u => u.email.toLowerCase().trim() === partnerEmail);
        currentAvailableBalance = me ? (me.walletBalance || 0) : 0;

        const allApps = await appRes.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingTotal = 0;
        let tableHtml = "";

        myApps.forEach(data => {
            const status = (data.status || 'PENDING').toUpperCase();
            if(status !== 'REJECTED') pendingTotal += Number(data.commissionBDT || 0);

            const row = `
                <tr>
                    <td><b>${data.studentName}</b></td>
                    <td>${data.passportNo}</td>
                    <td>${data.university || 'N/A'}</td>
                    <td><span style="color:var(--gold); border:1px solid var(--gold); padding:2px 8px; border-radius:4px;">${status}</span></td>
                    <td>${new Date(data.timestamp).toLocaleDateString()}</td>
                    <td><button class="btn-gold" style="padding:2px 10px; font-size:11px;" onclick='showSlip(${JSON.stringify(data)})'>Slip</button></td>
                </tr>`;
            tableHtml += row;
        });

        // Update Dashboard UI
        const setTxt = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
        setTxt('topPending', `৳${pendingTotal.toLocaleString()}`);
        setTxt('topPendingE', `৳${pendingTotal.toLocaleString()}`);
        setTxt('topFinal', `৳${currentAvailableBalance.toLocaleString()}`);
        setTxt('withdrawableBal', `৳${currentAvailableBalance.toLocaleString()}`);
        setTxt('totalStudents', myApps.length);

        if(document.getElementById('quickStatsBody')) document.getElementById('quickStatsBody').innerHTML = tableHtml;
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = tableHtml;

    } catch (e) { console.error("Sync Error:", e); }
}

// --- 3. Search & Eligibility ---

async function searchUni() {
    // ১. ইনপুট ফিল্ড থেকে ভ্যালু নেওয়া
    const country = document.getElementById('fCountry').value.toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYear = parseInt(document.getElementById('userGap').value) || 0;

    // --- এখানে অ্যাড করুন ---
    const currentYear = new Date().getFullYear(); 
    const studentGap = sYear ? (currentYear - sYear) : 0;
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const isEligible = sGpa >= (u.minGPA || 0) && sScore >= (u.ieltsReq || 0) && studentGap <= (u.maxGapAllowed || 10);
                
                html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="background:var(--gold); color:black; padding:10px; border-radius:8px; font-weight:bold;">U</div>
                            <div>
                                <b class="text-gold" style="font-size:16px;">${u.universityName}</b><br>
                                <small style="color:#2ecc71;"><i class="fas fa-graduation-cap"></i> Suggested: ${u.category || 'Business, IT, Engineering'}</small><br>
                                <small style="color:#ccc;"><i class="fas fa-clock"></i> Duration: ${u.duration || '3-4 Years'}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <b>GPA: ${u.minGPA}+ | ${u.englishOptions}: ${u.ieltsReq}+</b><br>
                        <small style="color:#2ecc71;">Max Gap: ${u.maxGapAllowed} Years Allowed</small><br>
                        <small>MOI/Duolingo: Available</small>
                    </td>
                    <td>
                        <div style="border:1px dashed #2ecc71; padding:5px; border-radius:5px; text-align:center;">
                            <span style="color:#2ecc71; font-weight:bold;">Up to $${u.scholarshipMax || '0'}</span><br>
                            <small>Scholarship Offer</small>
                        </div>
                    </td>
                    <td>
                        Sem Fee: <b>$${u.totalSemesterFee}</b><br>
                        <small>Total Tuition: $${u.totalTuition || '20,000'}</small><br>
                        <small style="color:var(--gold);">Initial Flying: ৳${u.initialFlyingCost}</small>
                    </td>
                    <td>
                        <div style="background:#2ecc71; color:white; font-size:10px; padding:2px 5px; border-radius:4px; display:inline-block;">Visa: ${u.visaSuccess || '85%'} Success</div><br>
                        <small>Time: ${u.processingTime || '20 Days'}</small><br>
                        <b style="color:var(--gold);">Profit: ৳${u.commissionBDT.toLocaleString()}</b>
                    </td>
                    <td>
                        <button class="btn-gold" style="padding:5px; margin-bottom:5px; background:${isEligible ? '' : '#444'}" 
                            ${!isEligible ? 'disabled' : ''} onclick="openApplyModal('${u.universityName}', ${u.commissionBDT})">
                            ${isEligible ? 'Apply Now' : 'Not Eligible'}
                        </button>
                        <button onclick="downloadAssessmentPDF('${u._id}')" style="background:none; border:1px solid white; color:white; cursor:pointer; width:100%; font-size:11px; padding:3px; border-radius:4px;">
                            <i class="fas fa-file-pdf"></i> Get Flyer
                        </button>
                    </td>
                </tr>`;
            }
        });
        document.getElementById('uniListContainer').innerHTML = html || "<tr><td colspan='6'>No universities found.</td></tr>";
    } catch (e) { console.error(e); }
}

// --- 4. Submissions & Files ---
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Student Name & Passport are required!");

    const btn = document.getElementById('submitBtn');
    btn.innerText = "Uploading Files..."; btn.disabled = true;

    try {
        // Upload all 4 files dynamically
        const fileIds = ['file1', 'file2', 'file3', 'file4'];
        const uploadPromises = fileIds.map(id => {
            const file = document.getElementById(id).files[0];
            return file ? uploadFile(file) : Promise.resolve("");
        });
        
        const docs = await Promise.all(uploadPromises);

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, passportNo: sPass,
                university: selectedUniversity, partnerEmail: partnerEmail,
                commissionBDT: currentUniCommission, status: 'PENDING',
                documents: docs.filter(url => url !== ""), // Only send non-empty URLs
                timestamp: new Date().toISOString()
            })
        });

        if(res.ok) { alert("Application Submitted Successfully!"); location.reload(); }
    } catch (e) { alert("Submission failed!"); }
    finally { btn.innerText = "Submit File"; btn.disabled = false; }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url || "";
}

// --- 5. QR Slip Logic (Corrected Version) ---
// --- 5. QR Slip Logic (Updated Text) ---
function showSlip(data) {
    const trackingId = `TRAK-${data.studentName.split(' ')[0].toUpperCase()}-${data.passportNo.slice(-4)}`;
    
    // ডাইনামিক টেক্সট আপডেট
    if(document.getElementById('slipStatus')) {
        document.getElementById('slipStatus').innerText = "Submission Completed & In House Processing";
    }

    // বাকি ফিল্ডগুলো আগের মতোই থাকবে
    if(document.getElementById('slipName')) document.getElementById('slipName').innerText = data.studentName;
    if(document.getElementById('slipPassport')) document.getElementById('slipPassport').innerText = data.passportNo;
    if(document.getElementById('slipDest')) document.getElementById('slipDest').innerText = data.university;
    if(document.getElementById('slipTrackingID')) document.getElementById('slipTrackingID').innerText = trackingId;
    
    // QR Code এবং লোগো সেট করা
    const trackLink = `https://scc-ihp.com/track?id=${data.passportNo}`;
    if(document.getElementById('slipQR')) {
        document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackLink)}`;
    }
    
    if(document.getElementById('slipPartnerLogo')) {
        document.getElementById('slipPartnerLogo').src = partnerLogoBase64 || 'logo.jpeg';
    }

    document.getElementById('slipModal').style.display = 'flex';
}

// --- 6. Withdrawal Request ---
async function requestWithdraw() {
    const amount = Number(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const details = document.getElementById('paymentDetails').value;

    if(amount < 500) return alert("Minimum withdrawal is ৳500");
    if(amount > currentAvailableBalance) return alert("Insufficient balance!");
    if(!details) return alert("Please provide account details.");

    const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            partnerEmail, amount, method, details, status: 'PENDING', date: new Date().toISOString()
        })
    });

    if(res.ok) { alert("Withdrawal request submitted!"); location.reload(); }
}

// --- Helper Functions ---
function openApplyModal(name, comm) {
    selectedUniversity = name; currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}

function uploadPartnerLogo() {
    const file = document.getElementById('logoUpload').files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        partnerLogoBase64 = reader.result;
        document.getElementById('currentLogo').src = reader.result;
    };
    if (file) reader.readAsDataURL(file);
}

async function saveProfile() {
    const payload = {
        email: partnerEmail,
        contact: document.getElementById('pPhone').value,
        orgName: document.getElementById('pOrg').value,
        authorisedPerson: document.getElementById('pAuth').value,
        address: document.getElementById('pAddr').value,
        logoUrl: partnerLogoBase64 
    };
    const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    if(res.ok) {
        localStorage.setItem('user', JSON.stringify({...userData, ...payload}));
        alert("Profile Updated!");
    }
}
// --- 7. Assessment PDF Generator (Missing Feature) ---
async function downloadAssessmentPDF(uniId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fetch single uni data (Assuming an API exists)
    const res = await fetch(`/api/universities/${uniId}`);
    const u = await res.json();

    // PDF Design
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(241, 196, 15);
    doc.setFontSize(22);
    doc.text(u.universityName, 15, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Country: ${u.country}`, 15, 50);
    doc.text(`Minimum GPA: ${u.minGPA}`, 15, 60);
    doc.text(`English Req: ${u.ieltsReq}`, 15, 70);
    doc.text(`Semester Fee: $${u.totalSemesterFee}`, 15, 80);
    doc.text(`Estimated Profit: BDT ${u.commissionBDT}`, 15, 90);

    doc.setFontSize(10);
    doc.text("Generated by SCC IHP Partner Portal", 15, 280);
    
    doc.save(`${u.universityName}_Assessment.pdf`);
}