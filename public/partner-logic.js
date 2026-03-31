/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Full Stability & Error Fixed
 */

// --- GLOBAL CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentAvailableBalance = 0;
const EXCHANGE_RATES = { 'USD': 121, 'AUD': 82, 'EUR': 132, 'GBP': 155, 'CAD': 89 };

// --- 1. INITIALIZATION ---
window.onload = async () => {
    if (!userData.email) {
        window.location.href = 'login.html';
        return;
    }
    
    // UI Update
    if (document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.fullName || userData.orgName || "Partner";
    if (document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;

    const profileFields = { 'pOrg': 'orgName', 'pAuth': 'fullName', 'pPhone': 'contact' };
    for (let id in profileFields) {
        if (document.getElementById(id)) document.getElementById(id).value = userData[profileFields[id]] || "";
    }

    await initRealtimeData();
    await fetchUniversitiesForPartner();
};

// --- 2. UNIVERSITY LIST ---
window.fetchUniversitiesForPartner = async () => {
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const tbody = document.getElementById('partnerUniTable');
        if (!tbody) return;

        tbody.innerHTML = unis.map(u => {
            const tuition = parseFloat(u.totalTuitionFee) || 0;
            const commRate = parseFloat(u.commPercent) || 0;
            const currency = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currency] || 115;
            const fixedBonus = parseFloat(u.commFixedBDT) || 0;
            const estimatedProfit = Math.round((tuition * commRate / 100) * rate + fixedBonus);

            return `
            <tr>
                <td>
                    <b style="color:var(--gold); font-size:15px;">${u.universityName}</b><br>
                    <small><i class="fas fa-map-marker-alt"></i> ${u.location}, ${u.country}</small>
                </td>
                <td>
                    <small>GPA: <b>${u.minGPA || 0}</b></small><br>
                    <small>IELTS: <b>${u.ieltsReq || 0}</b></small>
                </td>
                <td>
                    <small>Tuition: <b>${currency} ${tuition.toLocaleString()}</b></small>
                </td>
                <td>
                    <div style="padding:5px; background:rgba(46, 204, 113, 0.1); border-radius:4px; border-left: 3px solid var(--green);">
                        <span style="color:var(--green); font-weight:bold; font-size:12px;">Profit: ৳${estimatedProfit.toLocaleString()}</span><br>
                        <small style="color:var(--gold); font-size:10px;">Bonus Included</small>
                    </div>
                </td>
                <td>
                    <button class="btn-gold" style="padding: 8px 12px; font-size:11px;" onclick="openApplyModal('${u.universityName}', '${u._id}')">APPLY NOW</button>
                    <button class="action-btn" style="background:#444; margin-top:5px; width:100%; border:none; color:white; border-radius:4px; cursor:pointer;" onclick="downloadAssessmentPDF('${u._id}')"><i class="fas fa-file-pdf"></i> Flyer</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Fetch Error:", e); }
};

// --- 3. DASHBOARD REALTIME DATA ---
window.initRealtimeData = async function() {
    if (!partnerEmail) return;
    try {
        // ১. সরাসরি এপ্লিকেশন এপিআই থেকে ডাটা আনা (যাতে সব ডাটা পাওয়া যায়)
        const response = await fetch(`/api/applications?partnerEmail=${encodeURIComponent(partnerEmail)}`);
        if (!response.ok) throw new Error('Applications fetch failed');
        const allApps = await response.json();

        // ২. আপনার ইমেইল অনুযায়ী ফিল্টার করা (নিশ্চিত হওয়ার জন্য)
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        // ৩. স্ট্যাটাস অনুযায়ী ক্যালকুলেশন
        let pendingBDT = 0;
        let totalStudents = myApps.length;

        const tableRows = myApps.map(app => {
            const status = (app.status || 'PENDING').toUpperCase();
            // রিজেক্টেড ছাড়া বাকি সব কমিশন যোগ হবে
            if(status !== 'REJECTED') {
                pendingBDT += Number(app.commissionBDT || 0);
            }

            return `
                <tr>
                    <td><b>${app.studentName}</b></td>
                    <td>${app.passportNo}</td>
                    <td>${app.university || 'N/A'}</td>
                    <td><span class="status-pill ${status.toLowerCase()}">${status}</span></td>
                    <td>৳${(app.commissionBDT || 0).toLocaleString()}</td>
                </tr>`;
        }).join('');

        // ৪. ড্যাশবোর্ড কার্ড আপডেট
        const setTxt = (id, val) => { if (document.getElementById(id)) document.getElementById(id).innerText = val; };
        
        setTxt('topPending', `৳${pendingBDT.toLocaleString()}`);
        setTxt('totalStudents', totalStudents);
        // ওয়ালেট ব্যালেন্সের জন্য আলাদা এপিআই কল না থাকলে স্ট্যাটাস থেকে নিতে হবে
        
        // ৫. টেবিল আপডেট (দুইটি টেবিলেই ডাটা পুশ করা)
        if (document.getElementById('quickStatsBody')) document.getElementById('quickStatsBody').innerHTML = tableRows;
        if (document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = tableRows;

    } catch (error) { 
        console.error("Dashboard Sync Error:", error); 
    }
};
// --- 4. SEARCH & ELIGIBILITY ---
async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYearInput = parseInt(document.getElementById('userGap').value) || 0;
    const container = document.getElementById('uniListContainer'); 

    if (!countryInput || !container) { if(container) container.innerHTML = ""; return; }

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const filteredUnis = unis.filter(u => u.country.toLowerCase().includes(countryInput));

        if (filteredUnis.length === 0) {
            container.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No results found.</td></tr>";
            return;
        }

        const currentYear = new Date().getFullYear();
        container.innerHTML = filteredUnis.map(u => {
            let studentGap = sYearInput > 1900 ? currentYear - sYearInput : sYearInput;
            const gapLimit = parseInt(u.gapAllowed) || 0;
            const isEligible = sGpa >= (u.minGPA || 0) && sScore >= (u.ieltsReq || 0) && studentGap <= gapLimit;

            const tuition = parseFloat(u.totalTuitionFee) || 0;
            const currency = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currency] || 115;
            const profit = Math.round((tuition * (u.commPercent || 0) / 100) * rate + (u.commFixedBDT || 0));

            return `
            <tr>
                <td><b class="text-gold">${u.universityName}</b><br><small>${u.location}</small></td>
                <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+<br>Gap: Max ${gapLimit}y</td>
                <td>Tuition: ${currency} ${tuition.toLocaleString()}<br>Living: ${u.livingCost || 'N/A'}</td>
                <td>Profit: <b>৳${profit.toLocaleString()}</b><br>Visa: ${u.visaRate || '85'}%</td>
                <td>
                    <button class="btn-gold" style="opacity:${isEligible ? 1 : 0.5}" ${!isEligible ? 'disabled' : ''} 
                        onclick="openApplyModal('${u.universityName}', '${u._id}')">
                        ${isEligible ? 'Apply' : 'Ineligible'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Search Error:", e); }
}

// --- 5. MODAL & SLIP ACTIONS ---
window.openApplyModal = (uniName, uniId) => {
    window.currentSelectedUniId = uniId;
    if(document.getElementById('modalTitle')) document.getElementById('modalTitle').innerText = "Applying for: " + uniName;
    // এখানে আপনার মোডাল ওপেন করার কোড (যেমন: modal.style.display = 'block')
};

window.showSlip = (data) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(241, 196, 15);
    doc.setFontSize(18);
    doc.text("STUDENT CAREER CONSULTANCY", 15, 18);
    doc.setFontSize(10);
    doc.text("Official Partner Admission Slip", 15, 25);
    doc.setTextColor(40, 40, 40);
    doc.text(`Student: ${data.studentName}`, 15, 50);
    doc.text(`Passport: ${data.passportNo}`, 15, 60);
    doc.text(`University: ${data.university}`, 15, 70);
    doc.text(`Status: ${data.status.toUpperCase()}`, 15, 80);
    doc.save(`Slip_${data.studentName}.pdf`);
};

// --- 6. CLOUDINARY & SUBMISSION ---
window.uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const result = await response.json();
        return result.secure_url;
    } catch (e) { return null; }
};

window.submitApplication = async () => {
    const btn = document.getElementById('submitBtn');
    const sName = document.getElementById('sName').value;
    const sPassport = document.getElementById('sPassport').value;

    if(!sName || !sPassport) return alert("Required fields missing!");

    btn.disabled = true; btn.innerText = "Uploading...";

    const uploadedUrls = [];
    for (let i = 1; i <= 4; i++) {
        const fileInput = document.getElementById('file' + i);
        if (fileInput && fileInput.files[0]) {
            const url = await uploadToCloudinary(fileInput.files[0]);
            if (url) uploadedUrls.push(url);
        }
    }

    const payload = {
        studentName: sName,
        passportNo: sPassport,
        university: document.getElementById('modalTitle').innerText.replace("Applying for: ", ""),
        universityId: window.currentSelectedUniId,
        partnerEmail: partnerEmail,
        documents: uploadedUrls,
        status: "PENDING",
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/applications', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) { alert("Submitted!"); location.reload(); }
    } catch (e) { alert("Error!"); }
    finally { btn.disabled = false; btn.innerText = "Submit File"; }
};

// --- 7. WALLET ACTIONS ---
window.requestTopUp = async () => {
    const amount = document.getElementById('topUpAmount').value;
    const trxId = document.getElementById('trxId').value;
    if(!amount || !trxId) return alert("Fill all fields!");

    try {
        await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerEmail, amount: Number(amount), trxId, type: 'TOPUP', status: 'PENDING' })
        });
        alert("Sent!");
    } catch (e) { console.error(e); }
};

// --- 8. PDF GENERATORS ---
window.downloadAssessmentPDF = async (uniId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    try {
        const res = await fetch(`/api/universities/${uniId}`);
        const u = await res.json();
        doc.setFillColor(26, 26, 46); doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(241, 196, 15); doc.setFontSize(20);
        doc.text(u.universityName, 15, 25);
        doc.setTextColor(40,40,40); doc.setFontSize(12);
        doc.text(`Location: ${u.location}, ${u.country}`, 15, 55);
        doc.text(`Requirements: GPA ${u.minGPA}, IELTS ${u.ieltsReq}`, 15, 65);
        doc.save(`${u.universityName}_Flyer.pdf`);
    } catch (e) { alert("Error generating PDF"); }
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };