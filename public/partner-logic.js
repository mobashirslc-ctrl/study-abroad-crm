/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Version: 3.0.2 (Fixed Duplicate Logic & Currency Ref)
 */

// --- GLOBAL CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentAvailableBalance = 0;
const EXCHANGE_RATES = { 'USD': 121, 'AUD': 82, 'EUR': 132, 'GBP': 155, 'CAD': 89 };

window.onload = async () => {
    if (!userData.email) {
        window.location.href = 'login.html';
        return;
    }
    if (document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.fullName || "Partner";
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
                        <span style="color:var(--green); font-weight:bold; font-size:12px;">Profit: ৳${pBDT.toLocaleString()}</span><br>
                        <small style="color:var(--gold); font-size:10px;">Bonus Included</small>
                    </div>
                </td>
                <td>
                    <button class="btn-gold" style="padding: 8px 12px; font-size:11px;" onclick="openApplyModal('${u.universityName}', '${u._id}')">APPLY NOW</button>
                    <button class="action-btn" style="background:#444; margin-top:5px; width:100%;" onclick="downloadAssessmentPDF('${u._id}')"><i class="fas fa-file-pdf"></i> Flyer</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Fetch Error:", e); }
};

// --- 4. SEARCH & ELIGIBILITY ---
async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYearInput = parseInt(document.getElementById('userGap').value) || 0;
    const container = document.getElementById('uniListContainer'); 

    if (countryInput === "" || !container) { container.innerHTML = ""; return; }

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const filteredUnis = unis.filter(u => u.country.toLowerCase().includes(countryInput));

        if (filteredUnis.length === 0) {
            container.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No results found.</td></tr>";
            return;
        }

        container.innerHTML = filteredUnis.map(u => {
            const currentYear = new Date().getFullYear();
            let studentGap = sYearInput > 1900 ? currentYear - sYearInput : 0;
            
            // এলিজিবিলিটি চেক
            const minGPA = parseFloat(u.minGPA) || 0;
            const ieltsReq = parseFloat(u.ieltsReq) || 0;
            const gapAllowed = parseInt(u.gapAllowed) || 0;
// searchUni ফাংশনের ভেতরের লুপে এটি ব্যবহার করুন
const gapAllowed = u.gapAllowed || "0";
const courseName = u.courseName || "General Course";
const livingCost = u.livingCost || "Not Specified";

uniListContainer.innerHTML += `
    <tr>
        <td>
            <b class="text-gold">${u.name}</b><br>
            <small>${courseName}</small><br>
            <small>${u.location}</small>
        </td>
        <td>
            GPA: ${u.minGPA}<br>
            IELTS: ${u.ieltsReq}<br>
            Gap: Max ${gapAllowed} Years
        </td>
        <td>
            Tuition: ${u.totalTuitionFee || 0} USD<br>
            Living: ${livingCost} USD
        </td>
        <td>
            Profit: ৳${estimatedProfit}<br>
            Visa: ${u.visaSuccess || '85%'}
        </td>
        <td>
            <button class="btn-gold" onclick="openApplyModal('${u.name}', '${courseName}')">Apply</button>
        </td>
    </tr>
`;
        }).join('');
    } catch (e) { console.error("Search Error:", e); }
}
// রিয়েল-টাইম ডেটা লোড করার ফাংশন (এটি না থাকলে এরর আসবে)
// এভাবে লিখলে ব্রাউজার সহজে খুঁজে পাবে
window.initRealtimeData = async function() {
    // ১. লোকাল স্টোরেজ থেকে ইউজারের ইমেইল ধরা (ডাইনামিক উপায়)
    const userData = JSON.parse(localStorage.getItem('user') || "{}");
    
    // আপনার সিস্টেমে ইমেইলটি 'user' অবজেক্টের ভেতর থাকে, তাই এভাবে চেক করুন:
    const pEmail = userData.email ? userData.email.toLowerCase().trim() : null;
    
    if (!pEmail) {
        console.error("Partner email missing! Please login again.");
        // ইউজারকে লগইন পেজে পাঠিয়ে দিতে পারেন
        // window.location.href = 'login.html'; 
        return;
    }

    console.log("Fetching statistics for:", pEmail);

    try {
        // ২. API কল (আপনার ব্যাকএন্ড যদি অন্য পোর্টে চলে তবে http://localhost:3000 যোগ করুন)
        const response = await fetch(`/api/partner-stats?email=${encodeURIComponent(pEmail)}`);
        
        if (!response.ok) throw new Error('Backend data fetch failed');
        
        const data = await response.json();

        // ৩. ড্যাশবোর্ডের কার্ডগুলো আপডেট করা
        const updateElement = (id, value, prefix = "") => {
            const el = document.getElementById(id);
            if (el) el.innerText = prefix + (value || 0).toLocaleString();
        };

        updateElement('topPending', data.pendingAmount, "৳");
        updateElement('topFinal', data.walletBalance, "৳");
        updateElement('totalStudents', data.totalStudents);
        
        if (document.getElementById('welcomeName')) {
            document.getElementById('welcomeName').innerText = data.orgName || userData.fullName || "Partner";
        }

        // ৪. রিসেন্ট অ্যাপ্লিকেশন টেবিল আপডেট
        const tableBody = document.getElementById('quickStatsBody');
        if (tableBody) {
            if (data.recentApplications && data.recentApplications.length > 0) {
                tableBody.innerHTML = data.recentApplications.map(app => `
                    <tr>
                        <td>${app.studentName}</td>
                        <td>${app.passportNo}</td>
                        <td>${app.university}</td>
                        <td><span class="status-pill ${app.status.toLowerCase()}">${app.status}</span></td>
                        <td>৳${(app.pendingAmount || 0).toLocaleString()}</td>
                    </tr>
                `).join('');
            } else {
                tableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No applications found</td></tr>";
            }
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
};
// --- 5. APPLICATION MODAL & SUBMISSION ---
window.openApplyModal

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
    const sName = document.getElementById('sName').value;
    const sPassport = document.getElementById('sPassport').value;

    // ভ্যালিডেশন চেক
    if(!sName || !sPassport) return alert("Student name and Passport are required!");

    btn.disabled = true;
    btn.innerText = "Uploading Files...";

    const fileIds = ['file1', 'file2', 'file3', 'file4'];
    const uploadedUrls = [];

    // ফাইল আপলোড লজিক
    for (const id of fileIds) {
        const fileInput = document.getElementById(id);
        if (fileInput && fileInput.files[0]) {
            const url = await uploadToCloudinary(fileInput.files[0]);
            if (url) uploadedUrls.push(url);
        }
    }

    const payload = {
        studentName: sName,
        passportNo: sPassport,
        university: document.getElementById('modalTitle').innerText.replace("Applying for: ", ""), 
        universityId: window.currentSelectedUniId, // এটি ট্র্যাক করার জন্য জরুরি
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
            alert("Application Submitted Successfully!");
            location.reload();
        } else {
            alert("Submission failed. Please try again.");
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