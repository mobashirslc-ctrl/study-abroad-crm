/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Full Compatibility with Admin Multi-Currency & Percentage Logic
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
    if(document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.name || "Partner";
    if(document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;
    
    const fields = { 'pOrg': 'orgName', 'pAuth': 'authorisedPerson', 'pPhone': 'contact', 'pAddr': 'address' };
    for (let id in fields) {
        if(document.getElementById(id)) document.getElementById(id).value = userData[fields[id]] || "";
    }

    if(userData.logoUrl) {
        partnerLogoBase64 = userData.logoUrl; 
        if(document.getElementById('currentLogo')) {
            document.getElementById('currentLogo').src = userData.logoUrl;
        }
    }

    initRealtimeData(); 
    searchUni(); 
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
            // নোট: কমিশন এখন অ্যাডমিন সেট করা ভ্যালু থেকে আসে
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

// --- ৩. Search & Eligibility (Multi-Currency & BDT Conversion) ---
async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.trim().toLowerCase();
    const sGpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const sScore = parseFloat(document.getElementById('userScore').value) || 0;
    const sYearInput = parseInt(document.getElementById('userGap').value) || 0;

    const container = document.getElementById('uniListContainer');

    if (!countryInput) {
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#777;'>Type a country name to start assessment...</td></tr>";
        return;
    }

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        
        const filteredUnis = unis.filter(u => u.country.toLowerCase().includes(countryInput));

        if (filteredUnis.length === 0) {
            container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No universities found.</td></tr>";
            return;
        }

        const currentYear = new Date().getFullYear();
        let html = "";

        // এক্সচেঞ্জ রেট (এটি ডাইনামিক করা ভালো, আপাতত স্ট্যাটিক)
        const rates = { 'USD': 120, 'AUD': 80, 'EUR': 130, 'CAD': 88, 'GBP': 152 };

        filteredUnis.forEach(u => {
            let studentGap = sYearInput > 1900 ? currentYear - sYearInput : sYearInput;
            const isEligible = sGpa >= (u.minGPA || 0) && sScore >= (u.ieltsReq || 0) && studentGap <= (u.maxGapAllowed || 10);

            const currencyMap = { 'USD': '$', 'AUD': 'A$', 'EUR': '€', 'CAD': 'C$', 'GBP': '£' };
            const sym = currencyMap[u.uCurrency] || '$';

            // কমিশন ক্যালকুলেশন
            const commissionRate = parseFloat(u.adminCommPercentage || 10); 
            const calculatedComm = (u.totalTuitionFee * (commissionRate / 100));
            
            // BDT তে কনভার্ট করা (অ্যাডমিন ওয়ালেটে দেখানোর জন্য)
            const commInBDT = Math.round(calculatedComm * (rates[u.uCurrency] || 115));

            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:start; gap:12px;">
                            <div style="background:var(--gold); color:black; padding:10px; border-radius:8px; font-weight:bold;">${u.uCurrency}</div>
                            <div>
                                <b class="text-gold" style="font-size:16px;">${u.universityName}</b><br>
                                <small style="color:#bbb;">${u.location}, ${u.country}</small>
                            </div>
                        </div>
                    </td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                    <td><b>${sym}${u.totalTuitionFee.toLocaleString()}</b></td>
                    <td style="text-align:center;">
                        <div style="background:rgba(46,204,113,0.1); padding:5px; border-radius:6px; border:1px solid var(--green);">
                            <small>Your Profit</small><br>
                            <b style="color:var(--green);">৳${commInBDT.toLocaleString()}</b>
                        </div>
                    </td>
                    <td>
                        <button class="btn-gold" style="width:100%; background:${isEligible ? '' : '#444'}" 
                            ${!isEligible ? 'disabled' : ''} onclick="openApplyModal('${u.universityName}', ${commInBDT})">
                            ${isEligible ? 'Apply Now' : 'Ineligible'}
                        </button>
                    </td>
                </tr>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); }
}


// --- 7. Assessment PDF Generator (FIXED) ---
async function downloadAssessmentPDF(uniId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        const res = await fetch(`/api/universities/${uniId}`);
        const u = await res.json();
        
        const currencyMap = { 'USD': '$', 'AUD': 'A$', 'EUR': '€', 'CAD': 'C$', 'GBP': '£' };
        const sym = currencyMap[u.uCurrency] || '$';

        // Header
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(241, 196, 15);
        doc.setFontSize(22);
        doc.text(u.universityName.toUpperCase(), 15, 25);
        
        // Body
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.text("UNIVERSITY ASSESSMENT REPORT", 15, 55);
        doc.line(15, 57, 100, 57);

        doc.setFontSize(11);
        doc.text(`Location: ${u.location}, ${u.country}`, 15, 65);
        doc.text(`Course: ${u.courseName || 'N/A'}`, 15, 73);
        doc.text(`Intake: ${u.intake || 'N/A'}`, 15, 81);
        doc.text(`Scholarship: ${u.scholarshipName} (${u.scholarshipMax}%)`, 15, 89);

        // Requirements Box
        doc.setFillColor(245, 245, 245);
        doc.rect(15, 100, 180, 30, 'F');
        doc.text(`Academic GPA Required: ${u.minGPA}+`, 20, 110);
        doc.text(`English (IELTS/PTE) Required: ${u.ieltsReq}+`, 20, 118);
        doc.text(`Max Study Gap Allowed: ${u.maxGapAllowed} Years`, 20, 126);

        // Fee Structure
        doc.setFontSize(13);
        doc.text("ESTIMATED FEE STRUCTURE", 15, 145);
        doc.setFontSize(11);
        doc.text(`- Application Fee: ${sym}${u.applicationFee || 0}`, 15, 155);
        doc.text(`- Initial Deposit: ${sym}${u.initialDeposit || 0}`, 15, 163);
        doc.text(`- Total Tuition Fee: ${sym}${u.totalTuitionFee}`, 15, 171);
        doc.text(`- Visa Success Rate: ${u.visaSuccessRate}%`, 15, 179);

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Generated by SCC IHP Partner Portal - Official Assessment Flyer", 15, 280);
        
        doc.save(`${u.universityName}_Flyer.pdf`);
    } catch (e) {
        console.error("PDF Error:", e);
        alert("Flyer জেনারেট করতে সমস্যা হয়েছে। ডাটা চেক করুন।");
    }

}
// --- ৮. Export Table Report (Final Fixed Version) ---
async function downloadPDFReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // ১. টেবিল আইডি চেক করা
        const tableId = '#fullTrackingTable';
        const tableExists = document.querySelector(tableId);

        if (!tableExists) {
            alert("Table not found! Please check if #fullTrackingTable exists in your HTML.");
            return;
        }

        // ২. হেডার ডিজাইন
        doc.setFontSize(18);
        doc.setTextColor(26, 26, 46); // Deep Blue
        doc.text("SCC Group | Student Tracking Report", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Partner: ${userData.orgName || partnerEmail}`, 14, 28);
        doc.text(`Generated Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}`, 14, 33);

        // ৩. অটো টেবিল জেনারেশন
        doc.autoTable({
            html: tableId,
            startY: 40,
            theme: 'striped',
            headStyles: { 
                fillColor: [26, 26, 46], 
                textColor: [241, 196, 15], // Gold Text
                fontSize: 10,
                halign: 'center'
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 3,
                overflow: 'linebreak'
            },
            columnStyles: {
                3: { halign: 'center', fontStyle: 'bold' } // Status Column
            }
        });
        
        // ৪. ফাইল সেভ (ইউনিক টাইমস্ট্যাম্প সহ)
        const fileName = `Student_Status_Report_${new Date().getTime()}.pdf`;
        doc.save(fileName);

    } catch (e) {
        console.error("PDF Export Error:", e);
        alert("Report ডাউনলোড করতে সমস্যা হয়েছে। কনসোল চেক করুন।");
    }
}