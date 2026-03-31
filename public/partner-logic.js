/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking, Wallet & Assessment
 */

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";
let currentAvailableBalance = 0; 

// --- 1. INITIALIZATION ---
window.onload = async () => {
    if (!userData.email) {
        window.location.href = 'login.html';
        return;
    }

    // UI Setup from LocalStorage
    document.getElementById('welcomeName').innerText = userData.fullName || userData.orgName || "Partner";
    document.getElementById('pEmail').value = partnerEmail;
    if(document.getElementById('pOrg')) document.getElementById('pOrg').value = userData.orgName || "";
    if(document.getElementById('pAuth')) document.getElementById('pAuth').value = userData.fullName || "";
    if(document.getElementById('pPhone')) document.getElementById('pPhone').value = userData.contact || "";

    if(userData.logoUrl && document.getElementById('currentLogo')) {
        document.getElementById('currentLogo').src = userData.logoUrl;
        const sidebarLogo = document.getElementById('sidebarLogo');
        if(sidebarLogo) sidebarLogo.src = userData.logoUrl;
    }

    await initRealtimeData();
    await searchUni(); 
};

// --- 2. DASHBOARD & WALLET SYNC ---
async function initRealtimeData() {
    if (!partnerEmail) return;
    try {
        const [userRes, appRes] = await Promise.all([
            fetch('/api/admin/users'), 
            fetch(`/api/applications`)
        ]);

        const allUsers = await userRes.json();
        const me = allUsers.find(u => (u.email || "").toLowerCase().trim() === partnerEmail);
        currentAvailableBalance = me ? (Number(me.walletBalance) || 0) : 0;

        const allApps = await appRes.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingTotal = 0;
        let tableHtml = "";

myApps.forEach(data => {
    const status = (data.status || 'PENDING').toUpperCase();
    const comm = Number(data.commissionBDT || 0);

    // শুধু 'DOCS_VERIFIED' হলে পেন্ডিং টোটাল এ যোগ হবে
    if(status === 'DOCS_VERIFIED') {
        pendingTotal += comm;
    }
    tableHtml += `
        <tr>
            <td><b>${data.studentName}</b></td>
            <td>${data.passportNo}</td>
            <td>${data.university || 'Direct Entry'}</td>
            <td><span class="status-pill ${status.toLowerCase()}">${status.replace(/_/g, ' ')}</span></td>
            <td>
    <button class="btn-slip-small" onclick="handleSlipView('${data.passportNo}')">
        <i class="fas fa-file-invoice"></i> View Slip
    </button>
</td>
        </tr>`;
});
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.innerText = val;
        };

        setEl('topPending', `৳${pendingTotal.toLocaleString()}`);
        setEl('topFinal', `৳${currentAvailableBalance.toLocaleString()}`);
        setEl('topPendingE', `৳${pendingTotal.toLocaleString()}`);
        setEl('withdrawableBal', `৳${currentAvailableBalance.toLocaleString()}`);
        setEl('availableWithdrawBalance', currentAvailableBalance.toLocaleString());
        setEl('totalStudents', myApps.length);

        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = tableHtml || "<tr><td colspan='5'>No records found</td></tr>";
        if(document.getElementById('quickStatsBody')) document.getElementById('quickStatsBody').innerHTML = tableHtml || "<tr><td colspan='5'>No records found</td></tr>";
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = tableHtml || "<tr><td colspan='5'>No history found</td></tr>";

        const withdrawInput = document.getElementById('withdrawAmount');
        if(withdrawInput) {
            withdrawInput.disabled = (currentAvailableBalance < 500);
            withdrawInput.placeholder = currentAvailableBalance >= 500 ? "Max: " + currentAvailableBalance : "Min 500 BDT";
        }
    } catch (e) { console.error("Sync Error:", e); }
}

// --- 3. MEGA SEARCH & ELIGIBILITY ---
async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYear = parseInt(document.getElementById('userGap').value) || 0;
    
    const currentYear = new Date().getFullYear();
    const studentGap = sYear ? (currentYear - sYear) : 0;
    const hasInputs = sGpa > 0 && sScore > 0;

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const isGpaOk = sGpa >= (u.minGPA || 0);
                const isIeltsOk = sScore >= (u.ieltsReq || 0);
                const isGapOk = studentGap <= (u.maxGapAllowed || 5);
                const isEligible = hasInputs && isGpaOk && isIeltsOk && isGapOk;

                html += `
                <tr style="border-bottom: 1px solid #333;">
                    <td><b style="color:var(--gold);">${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+<br><small>Max Gap: ${u.maxGapAllowed}Y</small></td>
                    <td>$${(u.totalTuitionFee || 0).toLocaleString()}</td>
                    <td><b style="color:var(--gold);">৳${(u.commissionBDT || 0).toLocaleString()}</b></td>
                    <td style="text-align:center;">
                        <button class="btn-gold" style="background:${isEligible ? '' : '#444'}" 
                                ${!isEligible ? 'disabled' : ''} 
                                onclick="openApplyModal('${u.universityName}', ${u.commissionBDT})">
                            ${isEligible ? 'Apply Now' : 'Locked'}
                        </button><br>
                        <button onclick="downloadAssessmentPDF('${u._id}')" class="btn-pdf-small">
                           <i class="fas fa-file-pdf"></i> Report
                        </button>
                    </td>
                </tr>`;
            }
        });
        document.getElementById('uniListContainer').innerHTML = html || "<tr><td colspan='5'>No matches found</td></tr>";
    } catch (e) { console.error("Search Error:", e); }
}

// --- 4. FILE UPLOAD & SUBMISSION ---
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
        btn.innerText = "Processing..."; 
        btn.disabled = true;

        // ফাইল আপলোড
        const docs = await Promise.all([
            uploadFile(document.getElementById('file1')?.files[0]),
            uploadFile(document.getElementById('file2')?.files[0]),
            uploadFile(document.getElementById('file3')?.files[0]),
            uploadFile(document.getElementById('file4')?.files[0])
        ]);

        const payload = {
            studentName: sName, 
            passportNo: sPass,
            university: selectedUniversity || "Direct Entry", 
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission || 0,
            status: 'PENDING', 
            timestamp: new Date().toISOString(),
            pdf1: docs[0], pdf2: docs[1], pdf3: docs[2], pdf4: docs[3]
        };

        const res = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) { 
            alert("Submission Successful!");
            document.getElementById('applyModal').style.display = 'none'; 
            
            // সাবমিট হওয়ার সাথে সাথে স্লিপ দেখানো (পেলোড ডাটা দিয়ে)
            showAdmissionSlip(payload); 
        } else {
            alert("Submission failed on server.");
        }
    } catch (e) { 
        alert("Network Error!"); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Submit Application"; 
    }
}
// --- 5. WITHDRAWAL & SLIP FUNCTIONS ---
async function requestWithdraw() {
    const amount = Number(document.getElementById('withdrawAmount').value);
    if (amount < 500) return alert("Minimum 500 BDT required");
    if (amount > currentAvailableBalance) return alert("Insufficient balance");
    if(!confirm(`Withdraw ৳${amount}?`)) return;

    try {
        const res = await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, amount, type: 'WITHDRAW', status: 'PENDING' })
        });
        if(res.ok) { alert("Request Sent!"); location.reload(); }
    } catch (e) { alert("Error"); }
}

function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}
// পাসপোর্ট দিয়ে অ্যাপলিকেশন খুঁজে স্লিপ দেখাবে
async function handleSlipClick(passport) {
    try {
        const res = await fetch(`/api/applications`);
        const apps = await res.json();
        const studentData = apps.find(a => a.passportNo === passport);
        
        if(studentData) {
            showAdmissionSlip(studentData);
        } else {
            alert("Data not found!");
        }
    } catch (e) {
        console.error("Slip Error:", e);
    }
}
// স্লিপ দেখার জন্য স্পেশাল হ্যান্ডলার
async function handleSlipView(passportNo) {
    try {
        const res = await fetch(`/api/applications`);
        const allApps = await res.json();
        
        // পাসপোর্ট নম্বরটি খুঁজে বের করা
        const student = allApps.find(a => a.passportNo.trim() === passportNo.trim());
        
        if(student) {
            showAdmissionSlip(student);
        } else {
            alert("Application not found for: " + passportNo);
        }
    } catch (e) {
        console.error("Slip View Error:", e);
        alert("Could not load slip. Please try again.");
    }
}
window.handleSlipView = handleSlipView;

window.handleSlipClick = handleSlipClick; // গ্লোবাল এক্সপোজ

function showAdmissionSlip(appData) {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const user = JSON.parse(localStorage.getItem('user') || "{}");
    
    document.getElementById('slipStudentNameTop').innerText = appData.studentName;
    document.getElementById('slipStudentName').innerText = appData.studentName;
    document.getElementById('slipPassport').innerText = appData.passportNo;
    document.getElementById('slipDest').innerText = appData.university || "N/A";
    document.getElementById('slipCourse').innerText = "International Admissions";
    document.getElementById('slipRef').innerText = "SCC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('slipDate').innerText = today;

    document.getElementById('slipPartnerOrg').innerText = user.orgName || "SCC Partner";
    document.getElementById('slipPartnerName').innerText = user.fullName || "Authorized Agent";
    document.getElementById('slipPartnerPhone').innerText = user.contact || "N/A";
    document.getElementById('slipPartnerEmail').innerText = user.email || "N/A";

    const trackLink = `https://study-abroad-crm-nine.vercel.app/track.html?passport=${appData.passportNo}`;
    document.getElementById('slipQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackLink)}`;

    document.getElementById('slipModal').style.display = 'flex';
}

// --- 6. UTILS & EXPOSE ---
function printSlip() { window.print(); }
function logout() { localStorage.clear(); window.location.href='login.html'; }

window.searchUni = searchUni;
window.submitApplication = submitApplication;
window.requestWithdraw = requestWithdraw;
window.openApplyModal = openApplyModal;
window.printSlip = printSlip;
window.closeSlip = () => { 
    document.getElementById('slipModal').style.display = 'none';
    location.reload(); 
};
// ম্যানুয়াল অ্যাপ্লাই বাটন লজিক
window.openManualApply = () => {
    // ইউজারের কাছ থেকে শুধু ইউনিভার্সিটির নাম নেওয়া (বাকিগুলো ফর্ম থেকে আসবে)
    const uniName = prompt("Enter University Name:", "Direct Admission");
    if (!uniName) return;

    selectedUniversity = uniName;
    currentUniCommission = 5000; // আপনার ফিক্সড কমিশন

    // মডাল টাইটেল আপডেট
    document.getElementById('modalTitle').innerText = "Manual: " + uniName;
    
    // ফর্ম ক্লিয়ার করা (যাতে আগের স্টুডেন্টের নাম না থাকে)
    document.getElementById('sName').value = "";
    document.getElementById('sPassport').value = "";

    document.getElementById('applyModal').style.display = 'flex';
};

    // ফাইলের একদম শেষে এই অংশটুকু রিপ্লেস করুন
window.openManualApply = () => {
    const uniName = prompt("Enter University Name:", "Direct Admission");
    if (!uniName) return;

    selectedUniversity = uniName;
    currentUniCommission = 5000; 

    document.getElementById('modalTitle').innerText = "Manual: " + uniName;
    document.getElementById('sName').value = "";
    document.getElementById('sPassport').value = "";
    document.getElementById('applyModal').style.display = 'flex';

    // লগটি ফাংশনের ভেতরে নিয়ে আসা হয়েছে
    console.log("Manual Mode Activated:", uniName, "Comm: 5000"); 
};
