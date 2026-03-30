/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Version: 3.0.1 (Full Compatibility with Admin Multi-Currency & Percentage Logic)
 * Features: Student Tracking, Wallet Management, Multi-Currency Conversion, PDF Flyer
 */

// --- GLOBAL CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

// User Session Data
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

// Global State
let currentAvailableBalance = 0;
const EXCHANGE_RATES = { 'USD': 121, 'AUD': 82, 'EUR': 132, 'GBP': 155, 'CAD': 89 };

// --- 1. INITIALIZATION ON LOAD ---
window.onload = async () => {
    if (!userData.email) {
        window.location.href = 'login.html';
        return;
    }

    // Display User Profile Info
    if (document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.fullName || "Partner";
    if (document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;

    const profileFields = { 'pOrg': 'orgName', 'pAuth': 'fullName', 'pPhone': 'contact' };
    for (let id in profileFields) {
        if (document.getElementById(id)) document.getElementById(id).value = userData[profileFields[id]] || "";
    }

    // Load Data
    await initRealtimeData();
    await fetchUniversitiesForPartner();
};

// --- 2. UNIVERSITY LIST (ALL UNIVERSITIES) ---
window.fetchUniversitiesForPartner = async () => {
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const tbody = document.getElementById('partnerUniTable');
        if (!tbody) return;

        tbody.innerHTML = unis.map(u => `
            <tr>
                <td>
                    <b style="color:var(--gold); font-size:15px;">${u.universityName}</b><br>
                    <small><i class="fas fa-map-marker-alt"></i> ${u.location}, ${u.country}</small><br>
                    <span class="badge" style="background:#252545; font-size:10px; color:#fff;">${u.intake}</span>
                </td>
                <td>
                    <small>GPA: <b>${u.minGPA}</b></small><br>
                    <small>IELTS: <b>${u.ieltsReq}</b></small><br>
                    <small>Max Gap: <b>${u.gapAllowed} Years</b></small>
                </td>
                <td>
    <small>Tuition: <b>${u.uCurrency || 'USD'} ${(u.totalTuitionFee || 0).toLocaleString()}</b></small><br>
    <small>App Fee: <b style="color:#ff4757;">${u.uCurrency || 'USD'} ${(u.applicationFee || 0).toLocaleString()}</b></small><br>
    <small>Living: <b>${u.uCurrency || 'USD'} ${(u.livingCost || 0).toLocaleString()}/mo</b></small>
</td>
                <td>
                    <small>Visa Rate: <b>${u.visaRate || 85}%</b></small><br>
                    <div style="margin-top:5px; padding:5px; background:rgba(46, 204, 113, 0.1); border-radius:4px; border-left: 3px solid var(--green);">
                        <span style="color:var(--green); font-weight:bold; font-size:12px;">Profit: ${u.commPercent}%</span><br>
                        <span style="color:var(--gold); font-size:11px;">Bonus: ৳${(u.commFixedBDT || 0).toLocaleString()}</span>
                    </div>
                </td>
                <td>
                    <button class="btn-gold" style="padding: 8px 12px; font-size:11px;" onclick="openApplyModal('${u.universityName}', '${u._id}')">
                        APPLY NOW
                    </button>
                    <button class="action-btn" style="background:#444; margin-top:5px; width:100%;" onclick="downloadAssessmentPDF('${u._id}')">
                        <i class="fas fa-file-pdf"></i> Flyer
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error("Fetch Error:", e); }
};

// --- 3. REALTIME DATA & WALLET SYNC ---
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
            if(status !== 'REJECTED' && status !== 'CANCELLED') {
                pendingTotal += Number(data.commissionBDT || 0);
            }

            tableHtml += `
                <tr>
                    <td><b>${data.studentName}</b></td>
                    <td>${data.passportNo}</td>
                    <td>${data.appliedUniversity || data.university || 'N/A'}</td>
                    <td><span class="badge" style="border:1px solid var(--gold); color:var(--gold);">${status}</span></td>
                    <td>${new Date(data.timestamp).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn" style="background:var(--gold); color:black;" onclick='showSlip(${JSON.stringify(data)})'>
                            <i class="fas fa-print"></i> Slip
                        </button>
                    </td>
                </tr>`;
        });

        // Update UI Dashboard
        const setTxt = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
        setTxt('topPending', `৳${pendingTotal.toLocaleString()}`);
        setTxt('topFinal', `৳${currentAvailableBalance.toLocaleString()}`);
        setTxt('withdrawableBal', `৳${currentAvailableBalance.toLocaleString()}`);
        setTxt('totalStudents', myApps.length);

        if(document.getElementById('quickStatsBody')) document.getElementById('quickStatsBody').innerHTML = tableHtml;
        if(document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = tableHtml;

    } catch (e) { console.error("Sync Error:", e); }
}

// --- 4. SEARCH & ELIGIBILITY ASSESSMENT ---
async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYearInput = parseInt(document.getElementById('userGap').value) || 0;
    
    const container = document.getElementById('uniListContainer'); 
    if (!container) return;

    // ১. কান্ট্রি ইনপুট না থাকলে রেজাল্ট অটো ব্ল্যাঙ্ক হয়ে যাবে
    if (countryInput === "") {
        container.innerHTML = "";
        return;
    }

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        
        // কান্ট্রি অনুযায়ী ফিল্টার
        const filteredUnis = unis.filter(u => 
            u.country.toLowerCase().includes(countryInput)
        );

        if (filteredUnis.length === 0) {
            container.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No universities found for this country.</td></tr>";
            return;
        }

        container.innerHTML = filteredUnis.map(u => {
            const currentYear = new Date().getFullYear();
            let studentGap = sYearInput > 1900 ? currentYear - sYearInput : sYearInput;
            
            // ২. লকিং সিস্টেম লজিক (Academic + Language + Gap)
            const isEligible = sGpa >= (u.minGPA || 0) && 
                               sScore >= (u.ieltsReq || 0) && 
                               studentGap <= (u.gapAllowed || 0);

            // ৩. কমিশন ক্যালকুলেশন (University Currency-তে)
            const uCurr = (u.uCurrency || 'USD').toUpperCase();
            const semesterFee = (u.totalTuitionFee || 0);
            const commPerc = (u.commPercent || 0);
            
            // সম্ভাব্য প্রফিট ক্যালকুলেশন
            const estimatedProfit = (semesterFee * commPerc) / 100;

            return `
            <tr style="${!isEligible ? 'opacity: 0.6; background: rgba(0,0,0,0.1);' : ''}">
                <td>
                    <b class="text-gold" style="font-size:15px;">${u.universityName}</b><br>
                    <small><i class="fas fa-map-marker-alt"></i> ${u.location}, ${u.country}</small><br>
                    <span style="color:#00d4ff; font-size:11px;">Course: ${u.popularCourse || 'General Admission'}</span>
                </td>
                <td>
                    <small>Min GPA: <b>${u.minGPA || 0}+</b></small><br>
                    <small>IELTS/PTE: <b>${u.ieltsReq || 0}+</b></small><br>
                    <small>Max Gap: <b>${u.gapAllowed || 0} Years</b></small>
                </td>
                <td>
                    <small>Tuition: <b>${uCurr} ${semesterFee.toLocaleString()}</b></small><br>
                    <small>App Fee: <b style="color:#ff4757;">${uCurr} ${u.applicationFee || 0}</b></small><br>
                    <div style="margin-top:5px; padding:5px; background:rgba(46, 204, 113, 0.1); border-radius:4px; border-left: 3px solid var(--green);">
                        <span style="color:var(--green); font-weight:bold; font-size:11px;">Est. Profit: ${uCurr} ${estimatedProfit.toLocaleString()}</span><br>
                        <small style="font-size:9px; color:#aaa;">*Subject to Student Payment</small>
                    </div>
                </td>
                <td>
                    ${isEligible ? 
                        `<button class="btn-gold" style="padding: 8px 12px; font-size:11px;" onclick="openApplyModal('${u.universityName}', '${u._id}')">
                            APPLY NOW
                        </button>` : 
                        `<div style="color:#ff4757; font-size:10px; font-weight:bold;">
                            <i class="fas fa-lock"></i> INELIGIBLE
                        </div>`
                    }
                    <button class="action-btn" style="background:#444; margin-top:5px; width:100%; font-size:10px;" onclick="downloadAssessmentPDF('${u._id}')">
                        <i class="fas fa-file-pdf"></i> Flyer
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { 
        console.error("Search Error:", e);
        container.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Error loading data.</td></tr>";
    }
}
            
            // Eligibility Check
            const isEligible = sGpa >= (u.minGPA || 0) && 
                               sScore >= (u.ieltsReq || 0) && 
                               studentGap <= (u.gapAllowed || 10);

            // --- CURRENCY LOGIC (Moved inside map) ---
            const currencyCode = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currencyCode] || 115;
            const commFromPercent = (u.totalTuitionFee * (u.commPercent / 100)) * rate;
            const totalProfitBDT = Math.round(commFromPercent + (u.commFixedBDT || 0));

           return `
    <tr>
        <td>
            <b class="text-gold" style="font-size:15px;">${u.universityName}</b><br>
            <small>${u.location}, ${u.country}</small>
        </td>
        <td>
            <small>GPA: <b>${u.minGPA || 0}+</b></small><br>
            <small>IELTS: <b>${u.ieltsReq || 0}+</b></small>
        </td>
        <td>
            <small>Tuition: <b>${u.uCurrency || 'USD'} ${(u.totalTuitionFee || 0).toLocaleString()}</b></small><br>
            <div style="background:rgba(46,204,113,0.1); padding:5px; border-radius:6px; margin-top:5px;">
                <b style="color:var(--green); font-size:12px;">Profit: ৳${totalProfitBDT.toLocaleString()}</b>
            </div>
        </td>
        <td>
            <button class="btn-gold" style="padding:5px 10px; font-size:11px; opacity:${isEligible ? 1 : 0.5}" 
                ${!isEligible ? 'disabled' : ''} onclick="openApplyModal('${u.universityName}', '${u._id}')">
                ${isEligible ? 'APPLY' : 'INELIGIBLE'}
            </button>
        </td>
    </tr>`;
        }).join('');
    } catch (e) { console.error("Search Error:", e); }
}

// --- 5. APPLICATION MODAL & SUBMISSION ---
window.openApplyModal = (uniName, uniId) => {
    const modal = document.getElementById('applyModal');
    if(modal) {
        modal.style.display = 'flex';
        document.getElementById('modalTitle').innerText = "Applying for: " + uniName;
        // ইউনিভার্সিটি আইডিটি পরে ব্যবহারের জন্য একটি গ্লোবাল ভ্যারিয়েবলে রাখতে পারেন
        window.currentSelectedUniId = uniId; 
    }
};

// --- 6. LOGOUT ---
window.logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};
// --- 7. ASSESSMENT PDF GENERATOR (FLYER) ---
window.downloadAssessmentPDF = async (uniId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        // ডাটাবেস থেকে নির্দিষ্ট ইউনিভার্সিটির ডাটা আনা
        const res = await fetch(`/api/universities/${uniId}`);
        const u = await res.json();
        
        const sym = u.uCurrency || '$';

        // Header Design (Blue Box)
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(241, 196, 15); // Gold Color
        doc.setFontSize(22);
        doc.text(u.universityName.toUpperCase(), 15, 25);
        
        // Body Title
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.text("UNIVERSITY ASSESSMENT REPORT", 15, 55);
        doc.line(15, 57, 100, 57);

        // University Details
        doc.setFontSize(11);
        doc.text(`Location: ${u.location}, ${u.country}`, 15, 65);
        doc.text(`Intake: ${u.intake || 'N/A'}`, 15, 73);
        doc.text(`Popular Course: ${u.popularCourse || 'General'}`, 15, 81);

        // Requirements Section (Light Gray Box)
        doc.setFillColor(245, 245, 245);
        doc.rect(15, 90, 180, 35, 'F');
        doc.setTextColor(26, 26, 46);
        doc.text(`- Academic GPA Required: ${u.minGPA}+`, 20, 100);
        doc.text(`- English Proficiency (IELTS/PTE): ${u.ieltsReq}+`, 20, 108);
        doc.text(`- Max Study Gap Allowed: ${u.gapAllowed} Years`, 20, 116);

        // Fee Structure Section
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("ESTIMATED FEE STRUCTURE", 15, 140);
        doc.setFontSize(11);
        doc.text(`- Application Fee: ${sym} ${u.applicationFee || 0}`, 15, 150);
        doc.text(`- Initial Deposit: ${sym} ${u.initialDeposit || 0}`, 15, 158);
        doc.text(`- Total Tuition Fee: ${sym} ${u.totalTuitionFee.toLocaleString()}`, 15, 166);
        doc.text(`- Living Cost: ${sym} ${u.livingCost || 0} / month`, 15, 174);
        
        // Visa Success Info
        doc.setTextColor(46, 204, 113); // Green
        doc.text(`- Estimated Visa Success Rate: ${u.visaRate || 85}%`, 15, 185);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Generated by IHP Partner Portal - SCC Group Official Assessment", 15, 280);
        
        // Save PDF
        doc.save(`${u.universityName}_Assessment.pdf`);

    } catch (e) {
        console.error("PDF Error:", e);
        alert("Flyer জেনারেট করতে সমস্যা হয়েছে। অনুগ্রহ করে ডাটা চেক করুন।");
    }
};

// --- 8. EXPORT FULL TRACKING REPORT (TABLE TO PDF) ---
window.downloadPDFReport = async () => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // টেবিল আইডি চেক
        const tableId = document.getElementById('fullTrackingTable');
        if (!tableId) {
            alert("Table not found! Please check #fullTrackingTable in your HTML.");
            return;
        }

        // PDF Header
        doc.setFontSize(18);
        doc.setTextColor(26, 26, 46);
        doc.text("SCC Group | Partner Tracking Report", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Partner Organization: ${userData.orgName || 'N/A'}`, 14, 28);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 33);

        // AutoTable Generation
        doc.autoTable({
            html: '#fullTrackingTable',
            startY: 40,
            theme: 'striped',
            headStyles: { 
                fillColor: [26, 26, 46], 
                textColor: [241, 196, 15],
                fontSize: 10,
                halign: 'center'
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 3 
            }
        });
        
        // Save PDF
        const timeStamp = new Date().getTime();
        doc.save(`Student_Report_${timeStamp}.pdf`);

    } catch (e) {
        console.error("Report Export Error:", e);
        alert("রিপোর্ট ডাউনলোড করতে সমস্যা হয়েছে।");
    }
};
// --- 9. ADMISSION SLIP GENERATOR (STUDENT COPY) ---
window.showSlip = (data) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Design Elements (Gold & Dark Theme)
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(241, 196, 15);
    doc.setFontSize(18);
    doc.text("STUDENT CAREER CONSULTANCY", 15, 18);
    doc.setFontSize(10);
    doc.text("Official Partner Admission Slip", 15, 25);

    // Student Info Section
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.text("APPLICATION DETAILS", 15, 50);
    doc.line(15, 52, 60, 52);

    doc.setFontSize(10);
    const details = [
        ["Student Name", data.studentName],
        ["Passport No", data.passportNo],
        ["Applied University", data.appliedUniversity || data.university],
        ["Partner Org", userData.orgName || "Direct"],
        ["Submission Date", new Date(data.timestamp).toLocaleDateString()],
        ["Current Status", (data.status || "PENDING").toUpperCase()]
    ];

    doc.autoTable({
        startY: 55,
        body: details,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    });

    // Verification QR or Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Note: This is an auto-generated receipt for file tracking purposes.", 15, 130);
    doc.text("Scan QR for real-time status update.", 15, 135);

    // Save File
    doc.save(`Slip_${data.studentName.replace(/\s+/g, '_')}.pdf`);
};

// --- 10. CLOUDINARY FILE UPLOAD LOGIC ---
// পার্টনার যখন স্টুডেন্ট ফাইল আপলোড করবে
window.uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        return result.secure_url; // এটি ডাটাবেসে সেভ হবে
    } catch (e) {
        console.error("Cloudinary Error:", e);
        return null;
    }
};

// --- 11. FORM SUBMISSION (APPLY NOW LOGIC) ---
// এটি পার্টনারের অ্যাপ্লাই করার ফাইনাল লজিক
window.submitApplication = async () => {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Uploading Files...";

    const fileIds = ['file1', 'file2', 'file3', 'file4'];
    const uploadedUrls = [];

    // লুপ চালিয়ে সব ফাইল আপলোড
   for (const id of fileIds) {
    const fileInput = document.getElementById(id);
    if (fileInput && fileInput.files[0]) {
        const url = await uploadToCloudinary(fileInput.files[0]);
        if (url) uploadedUrls.push(url);
    }
}

    const payload = {
        studentName: document.getElementById('sName').value,
        passportNo: document.getElementById('sPassport').value,
        university: document.getElementById('modalTitle').innerText.replace("Applying for: ", ""), 
        partnerEmail: partnerEmail,
        documents: uploadedUrls, // অ্যারে হিসেবে সেভ হবে
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
            alert("Application Submitted Successfully!");
            location.reload();
        }
    } catch (e) {
        console.error("Submit Error:", e);
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit File";
    }
};
// --- 12. WALLET ACTIONS (TOP-UP & WITHDRAW) ---
window.requestTopUp = async () => {
    const amount = document.getElementById('topUpAmount').value;
    const method = document.getElementById('paymentMethod').value; // bKash/Nagad
    const trxId = document.getElementById('trxId').value;

    if(!amount || !trxId) return alert("Please fill all fields!");

    const payload = {
        partnerEmail,
        type: 'TOPUP',
        amount: Number(amount),
        method,
        trxId,
        status: 'PENDING',
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) alert("Top-up request sent! Wait for Admin approval.");
    } catch (e) { console.error(e); }
};

window.requestWithdraw = async () => {
    const amount = Number(document.getElementById('withdrawAmount').value);
    
    if(amount > currentAvailableBalance) return alert("Insufficient balance!");

    const payload = {
        partnerEmail,
        type: 'WITHDRAW',
        amount,
        status: 'PENDING',
        timestamp: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) alert("Withdrawal request sent!");
    } catch (e) { console.error(e); }
};

// --- END OF LOGIC ---
/**
 * PDF ও রিপোর্ট জেনারেশন ফাংশনগুলো আগের মতোই থাকবে (jsPDF ব্যবহার করে)
 */