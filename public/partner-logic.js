/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking & Wallet
 */

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";
let currentAvailableBalance = 0; 

// --- 1. Initialization (Window Onload) ---
window.onload = () => {
    // Expose functions to window for HTML access
    window.saveProfile = saveProfile;
    window.uploadPartnerLogo = uploadPartnerLogo;
    window.downloadAssessmentPDF = downloadAssessmentPDF;
    window.searchUni = searchUni;
    window.openApplyModal = openApplyModal;
    window.submitApplication = submitApplication;
    window.requestWithdraw = requestWithdraw;
    window.logout = logout;
    window.downloadPDFReport = downloadPDFReport;

    // UI Initial Set
    if(document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.name || "Partner";
    if(document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;
    if(document.getElementById('pOrg')) document.getElementById('pOrg').value = userData.orgName || userData.name || "";
    if(document.getElementById('pAuth')) document.getElementById('pAuth').value = userData.authorisedPerson || "";
    if(document.getElementById('pPhone')) document.getElementById('pPhone').value = userData.contact || "";
    if(document.getElementById('pAddr')) document.getElementById('pAddr').value = userData.address || "";

    // Logo Setup
    if(userData.logoUrl) {
        if(document.getElementById('currentLogo')) document.getElementById('currentLogo').src = userData.logoUrl;
        const sidebarLogo = document.getElementById('sidebarLogo');
        if(sidebarLogo) sidebarLogo.src = userData.logoUrl;
    }

    initRealtimeData(); 
    searchUni(); 
};

// --- 2. Reports & PDF ---
function downloadPDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Student Application Report - SCC Group", 14, 15);
    doc.autoTable({
        html: '#fullTrackingBody',
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [26, 26, 46] }
    });
    doc.save("Student_Report.pdf");
}

async function downloadAssessmentPDF(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const logoImg = document.getElementById('currentLogo');
    if (logoImg && logoImg.src && !logoImg.src.includes('logo.jpeg')) {
        try {
            doc.addImage(logoImg.src, 'JPEG', 15, 10, 20, 20); 
        } catch (e) { console.warn("Logo skipped"); }
    }

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const u = unis.find(uni => uni._id === id);
        if(!u) return alert("Data not found");

        doc.setFontSize(16);
        doc.text(`University Assessment: ${u.universityName}`, 14, 35);
        doc.autoTable({
            startY: 40,
            head: [['Field', 'Details']],
            body: [
                ['University', u.universityName],
                ['Country', u.country],
                ['Min GPA', u.minGPA],
                ['IELTS Req', u.ieltsReq],
                ['Tuition Fee', `$${u.totalTuitionFee}`],
                ['Commission', `BDT ${u.commissionBDT}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [241, 196, 15] }
        });
        doc.save(`${u.universityName}_Assessment.pdf`);
    } catch (e) { alert("Error generating report"); }
}

// --- 3. Dashboard Logic & Wallet ---
async function initRealtimeData() {
    try {
        const userRes = await fetch('/api/admin/users'); 
        const allUsers = await userRes.json();
        const currentMe = allUsers.find(u => u.email.toLowerCase().trim() === partnerEmail);
        currentAvailableBalance = currentMe ? (currentMe.walletBalance || 0) : 0;

        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingTotal = 0; 
        let combinedHtml = ""; 

        myApps.forEach(data => {
            const status = (data.status || 'PENDING').toUpperCase();
            pendingTotal += Number(data.commissionBDT || 0);
            combinedHtml += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td>${data.university || 'N/A'}</td>
                <td><span class="badge" style="background:#252545; color:var(--gold); border: 1px solid var(--gold); padding: 5px 10px; border-radius:5px;">${status.replace(/_/g, ' ')}</span></td>
                <td>${new Date(data.timestamp).toLocaleDateString()}</td>
            </tr>`;
        });

        // UI Updates with Safe Check
        const setUI = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
        
        if(document.getElementById('topPending')) document.getElementById('topPending').innerHTML = `<small style="font-size:10px; display:block; color:#aaa;">ESTIMATED EARNINGS</small> ৳${pendingTotal.toLocaleString('en-IN')}`;
        setUI('topFinal', `৳${currentAvailableBalance.toLocaleString('en-IN')}`);
        setUI('withdrawableBal', `৳${currentAvailableBalance.toLocaleString('en-IN')}`);
        setUI('totalStudents', myApps.length);
        if(document.getElementById('topPendingE')) setUI('topPendingE', `৳${pendingTotal.toLocaleString('en-IN')}`);
        if(document.getElementById('topFinalE')) setUI('topFinalE', `৳${currentAvailableBalance.toLocaleString('en-IN')}`);

        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
    } catch (e) { console.error("Data Fetch Error:", e); }
}

// --- 4. Search & Unlock Logic ---
async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYear = parseInt(document.getElementById('userGap').value) || 0;
    const studentGap = sYear ? (new Date().getFullYear() - sYear) : 0;
    const hasInputs = sGpa > 0 && sScore > 0;

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const isEligible = hasInputs && sGpa >= (u.minGPA || 0) && sScore >= (u.ieltsReq || 0) && studentGap <= (u.maxGapAllowed || 10);

                html += `
                <tr style="border-bottom: 1px solid #333;">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="background:var(--gold); width:40px; height:40px; border-radius:5px; display:flex; justify-content:center; align-items:center; color:#000; font-weight:bold;">${u.universityName.charAt(0)}</div>
                            <div><b style="color:var(--gold);">${u.universityName}</b><br><small>${u.country}</small></div>
                        </div>
                    </td>
                    <td><span class="badge" style="background:#252545;">${u.degreeType}</span><br><small>Intake: ${u.intake || 'N/A'}</small></td>
                    <td><small>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</small><br><small>Gap: Max ${u.maxGapAllowed}Y</small></td>
                    <td><b>$${(u.totalTuitionFee || 0).toLocaleString()}</b><br><small style="color:#2ecc71;">Dep: $${u.initialDeposit || 0}</small></td>
                    <td><b style="color:var(--gold);">৳${(u.commissionBDT || 0).toLocaleString()}</b></td>
                    <td style="text-align:center;">
                        <button class="btn-gold" style="width:100px; background:${isEligible ? '' : '#444'}" ${!isEligible ? 'disabled' : ''} onclick="openApplyModal('${u.universityName}', ${u.commissionBDT})">
                            ${isEligible ? 'Apply Now' : 'Locked'}
                        </button><br>
                        <button onclick="downloadAssessmentPDF('${u._id}')" style="background:none; border:1px solid #555; color:#fff; font-size:10px; cursor:pointer; padding:2px 5px; margin-top:5px; border-radius:3px;">Report</button>
                    </td>
                </tr>`;
            }
        });
        document.getElementById('uniListContainer').innerHTML = html || "<tr><td colspan='6' style='text-align:center;'>No matches found.</td></tr>";
    } catch (e) { console.error("Search Error:", e); }
}

// --- 5. Submission & Wallet Actions ---
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPass) return alert("Student Name & Passport are mandatory!");

    try {
        btn.innerText = "Uploading Files..."; btn.disabled = true;
        const docs = await Promise.all([
            uploadFile(document.getElementById('file1')?.files[0]),
            uploadFile(document.getElementById('file2')?.files[0]),
            uploadFile(document.getElementById('file3')?.files[0]),
            uploadFile(document.getElementById('file4')?.files[0])
        ]);

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, passportNo: sPass,
                university: selectedUniversity, partnerEmail: partnerEmail,
                commissionBDT: currentUniCommission,
                status: 'PENDING', timestamp: new Date().toISOString(),
                pdf1: docs[0], pdf2: docs[1], pdf3: docs[2], pdf4: docs[3]
            })
        });
        if(res.ok) { alert("Successfully Submitted!"); location.reload(); }
    } catch (e) { alert("Submission failed"); } 
    finally { btn.disabled = false; btn.innerText = "Submit Application"; }
}

async function requestWithdraw() {
    const amount = Number(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const details = document.getElementById('paymentDetails').value;

    if (amount < 500 || amount > currentAvailableBalance) return alert("Invalid amount or insufficient balance");

    try {
        const res = await fetch('/api/withdrawals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, amount, method: `${method}: ${details}` })
        });
        if(res.ok) { alert("Withdrawal request sent!"); location.reload(); }
    } catch (e) { alert("Error sending request"); }
}

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

async function uploadPartnerLogo() {
    const file = document.getElementById('logoUpload').files[0];
    const url = await uploadFile(file);
    if(url) { document.getElementById('currentLogo').src = url; alert("Logo uploaded! Save profile to confirm."); }
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
    if(res.ok) { alert("✅ Profile Updated!"); localStorage.setItem('user', JSON.stringify({...userData, ...payload})); }
}

function openApplyModal(name, comm) {
    selectedUniversity = name; currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}

function logout() { localStorage.clear(); window.location.href='index.html'; }