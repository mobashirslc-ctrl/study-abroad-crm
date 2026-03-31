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

// --- ৩. DASHBOARD REALTIME DATA (সংশোধিত ওয়ালেট লজিক) ---
window.initRealtimeData = async function() {
    if (!partnerEmail) return;
    try {
        // ১. একসাথে ইউজার প্রোফাইল (ব্যালেন্সের জন্য) এবং এপ্লিকেশন (পেন্ডিংয়ের জন্য) কল করা
        const [userRes, appRes] = await Promise.all([
            fetch(`/api/admin/users`), // সব ইউজার আনার এপিআই
            fetch(`/api/applications?partnerEmail=${encodeURIComponent(partnerEmail)}`)
        ]);

        const allUsers = await userRes.json();
        const me = allUsers.find(u => (u.email || "").toLowerCase().trim() === partnerEmail);
        
        // ফাইনাল ব্যালেন্স (এডমিন যা সেট করেছে)
        currentAvailableBalance = me ? (me.walletBalance || 0) : 0;

        const myApps = await appRes.json();
        let pendingTotal = 0;

        const tableRows = myApps.map(app => {
            const status = (app.status || 'PENDING').toUpperCase();
            // পেন্ডিং বক্সের জন্য কমিশন ক্যালকুলেশন
            if(status !== 'REJECTED' && status !== 'CANCELLED') {
                pendingTotal += Number(app.commissionBDT || 0);
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

        // ২. ড্যাশবোর্ড কার্ড আপডেট
        const setTxt = (id, val) => { if (document.getElementById(id)) document.getElementById(id).innerText = val; };
        
        setTxt('topPending', `৳${pendingTotal.toLocaleString()}`); // পেন্ডিং বক্স
        setTxt('topFinal', `৳${currentAvailableBalance.toLocaleString()}`); // ফাইনাল ওয়ালেট বক্স
        setTxt('totalStudents', myApps.length);

        // ৩. টেবিল আপডেট

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
            // Gap Calculation (No Duplicate const here)
            let studentGap = sYearInput > 1900 ? currentYear - sYearInput : sYearInput;
            const allowedGap = parseInt(u.gapAllowed) || 0;
            
            // Eligibility Logic
            const isEligible = sGpa >= (u.minGPA || 0) && sScore >= (u.ieltsReq || 0) && studentGap <= allowedGap;

            const tuition = parseFloat(u.totalTuitionFee) || 0;
            const currency = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currency] || 115;
            const profit = Math.round((tuition * (u.commPercent || 0) / 100) * rate + (u.commFixedBDT || 0));

            return `
            <tr>
                <td><b class="text-gold">${u.universityName}</b><br><small>${u.location}</small></td>
                <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+<br>Gap: Max ${allowedGap}y</td>
                <td>Tuition: ${currency} ${tuition.toLocaleString()}<br>Living: ${u.livingCost || 'N/A'}</td>
                <td>Profit: <b>৳${profit.toLocaleString()}</b></td>
                <td>
                    <button class="btn-gold" 
                        style="opacity:${isEligible ? 1 : 0.5}; cursor:${isEligible ? 'pointer' : 'not-allowed'}" 
                        ${!isEligible ? 'disabled' : ''} 
                        onclick="window.openApplyModal('${u.universityName}', '${u._id}')">
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
    
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('applyModal'); // নিশ্চিত করুন HTML এ এই ID আছে
    
    if(modalTitle) modalTitle.innerText = "Applying for: " + uniName;
    
    // মোডাল ওপেন করার লজিক (CSS display block করে দেওয়া হলো)
    if(modal) {
        modal.style.display = 'block';
    } else {
        alert("Apply Modal not found in HTML!");
    }
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

// --- 6. SUBMISSION ---
window.submitApplication = async () => {
    const btn = document.getElementById('submitBtn');
    const sName = document.getElementById('sName').value;
    const sPassport = document.getElementById('sPassport').value;
    const modalTitle = document.getElementById('modalTitle');

    if(!sName || !sPassport) return alert("Required fields missing!");

    btn.disabled = true; 
    btn.innerText = "Uploading Files...";

    const uploadedUrls = [];
    // HTML-এ ইনপুটগুলোর আইডি file1, file2, file3, file4 হতে হবে
    for (let i = 1; i <= 4; i++) {
        const fileInput = document.getElementById('file' + i);
        if (fileInput && fileInput.files[0]) {
            const url = await window.uploadToCloudinary(fileInput.files[0]);
            if (url) uploadedUrls.push(url);
        }
    }

    const payload = {
        studentName: sName,
        passportNo: sPassport,
        university: modalTitle ? modalTitle.innerText.replace("Applying for: ", "") : "Unknown",
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
        if (res.ok) { 
            alert("Submitted Successfully!"); 
            location.reload(); 
        } else {
            alert("Server Error! Check required fields.");
        }
    } catch (e) { 
        alert("Submission Failed! Check connection."); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Submit File"; 
    }
};
// --- 7. WALLET ACTIONS (WITHDRAW FIX) ---
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
        alert("Top-up request sent!");
    } catch (e) { console.error(e); }
};

window.requestWithdraw = async () => {
    const amount = Number(document.getElementById('withdrawAmount').value);
    
    // ডাইনামিক ব্যালেন্স চেক (currentAvailableBalance গ্লোবাল ভেরিয়েবল থেকে আসে)
    if(!amount || amount <= 0) return alert("Please enter a valid amount!");
    if(amount > currentAvailableBalance) return alert("Insufficient Balance in your wallet!");

    const payload = {
        partnerEmail,
        type: 'WITHDRAW',
        amount: amount,
        status: 'PENDING',
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            alert("Withdrawal request sent for approval.");
            location.reload();
        }
    } catch (e) { 
        console.error("Withdraw Error:", e);
        alert("Withdrawal request failed!");
    }
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