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

            if(['DOCS_VERIFIED', 'PROCESSING', 'SUBMITTED', 'PENDING'].includes(status)) {
                pendingTotal += comm;
            }

            tableHtml += `
                <tr>
                    <td><b>${data.studentName}</b></td>
                    <td>${data.passportNo}</td>
                    <td>${data.university || 'Direct Entry'}</td>
                    <td><span class="status-pill ${status.toLowerCase()}">${status.replace(/_/g, ' ')}</span></td>
                    <td>৳${comm.toLocaleString()}</td>
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
        btn.innerText = "Processing..."; btn.disabled = true;
        
        const docs = await Promise.all([
            uploadFile(document.getElementById('file1')?.files[0]),
            uploadFile(document.getElementById('file2')?.files[0]),
            uploadFile(document.getElementById('file3')?.files[0]),
            uploadFile(document.getElementById('file4')?.files[0])
        ]);

        const res = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, 
                passportNo: sPass,
                university: selectedUniversity || "Direct Entry", 
                partnerEmail: partnerEmail,
                commissionBDT: currentUniCommission,
                status: 'PENDING', 
                timestamp: new Date().toISOString(),
                pdf1: docs[0], pdf2: docs[1], pdf3: docs[2], pdf4: docs[3]
            })
        });

        if(res.ok) { 
            alert("Submission Successful!");
            document.getElementById('applyModal').style.display = 'none'; 
            showAdmissionSlip({
                studentName: sName,
                passportNo: sPass,
                university: selectedUniversity || "Direct Entry"
            });
        } else {
            alert("Server Error! Try again.");
        }
    } catch (e) { 
        alert("Submission failed. Check connection."); 
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
window.openManualApply = async () => {
    const uniName = prompt("Enter University Name:");
    if (!uniName) return;
    const comm = prompt("Enter Expected Commission (BDT):", "0");
    selectedUniversity = uniName;
    currentUniCommission = Number(comm) || 0;
    if(document.getElementById('modalTitle')) document.getElementById('modalTitle').innerText = "Manual: " + uniName;
    if(document.getElementById('applyModal')) document.getElementById('applyModal').style.display = 'flex';
};