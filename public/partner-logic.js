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

// --- 2. DASHBOARD & WALLET SYNC (FIXED VERSION) ---
async function initRealtimeData() {
    if (!partnerEmail) return;
    try {
        const [userRes, appRes] = await Promise.all([
            fetch('/api/admin/users'), 
            fetch(`/api/applications`)
        ]);

        const allUsers = await userRes.json();
        // অ্যাডমিন প্যানেল থেকে ইউজারের (পার্টনারের) লেটেস্ট ওয়ালেট ব্যালেন্স নেওয়া
        const me = allUsers.find(u => (u.email || "").toLowerCase().trim() === partnerEmail);
        currentAvailableBalance = me ? (Number(me.walletBalance) || 0) : 0;

        const allApps = await appRes.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingTotal = 0;
        let tableHtml = "";

        myApps.forEach(data => {
            const status = (data.status || 'PENDING').toUpperCase();
            
            // ফিক্স: সরাসরি ডাটাবেসের pendingAmount রিড করা, কমিশন নয়। 
            // কারণ অ্যাডমিন টাকা দিলে pendingAmount কমে যায়, কিন্তু commissionBDT ফিক্সড থাকে।
            const currentPendingOfThisApp = Number(data.pendingAmount !== undefined ? data.pendingAmount : data.commissionBDT);

            // অ্যাডমিন যদি পার্শিয়াল পেমেন্ট করে, তবে pendingAmount ই হবে আসল পেন্ডিং
            pendingTotal += currentPendingOfThisApp;

            tableHtml += `
                <tr>
                    <td><b>${data.studentName}</b></td>
                    <td>${data.passportNo}</td>
                    <td>${data.university || 'Direct Entry'}</td>
                    <td><span class="status-pill ${status.toLowerCase()}">${status.replace(/_/g, ' ')}</span></td>
                    <td>
                        <div style="font-size:11px; color:#aaa;">Pending: ৳${currentPendingOfThisApp}</div>
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

        // UI আপডেট
        setEl('topPending', `৳${pendingTotal.toLocaleString()}`);
        setEl('topFinal', `৳${currentAvailableBalance.toLocaleString()}`);
        setEl('topPendingE', `৳${pendingTotal.toLocaleString()}`);
        setEl('withdrawableBal', `৳${currentAvailableBalance.toLocaleString()}`);
        setEl('totalStudents', myApps.length);

        if(document.getElementById('homeTrackingBody')) document.getElementById('homeTrackingBody').innerHTML = tableHtml || "<tr><td colspan='5'>No records found</td></tr>";
        
        // উইথড্র বাটন কন্ট্রোল
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
// এটি ফাইলের শেষে যোগ করুন
async function downloadAssessmentPDF(uniId) {
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const uni = unis.find(u => u._id === uniId);
        
        if(uni) {
            // আপনার তৈরি করা generateAssessmentPDF ফাংশনটিকে কল করা হচ্ছে
            generateAssessmentPDF({
                name: uni.universityName,
                country: uni.country,
                tuition: uni.totalTuitionFee,
                minGPA: uni.minGPA,
                minScore: uni.ieltsReq,
                scholarship: "Up to 30%" // অথবা আপনার ডাটাবেসের ফিল্ড
            });
        }
    } catch (e) {
        alert("Could not generate report.");
    }
}
window.downloadAssessmentPDF = downloadAssessmentPDF;
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

    // হেল্পার ফাংশন (যাতে আইডি না থাকলে এরর না দেয়)
    const setIfExists = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    // ১. ড্যাশবোর্ড আপডেট
    setIfExists('dashStudentName', appData.studentName);
    setIfExists('dashPassport', appData.passportNo);
    setIfExists('dashDest', appData.university || "Direct Entry");
    setIfExists('dashCourse', "International Admissions");

    // ২. মডাল/স্লিপ আপডেট
    setIfExists('slipStudentNameTop', appData.studentName);
    setIfExists('slipName', appData.studentName);
    setIfExists('slipPassport', appData.passportNo);
    setIfExists('slipDest', appData.university || "N/A");
    setIfExists('slipCourse', "International Admissions");
    setIfExists('slipRef', "SCC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
    setIfExists('slipDate', today);

    // ৩. পার্টনার ডাটা
    setIfExists('slipPartnerOrg', user.orgName || "SCC Partner");
    setIfExists('slipPartnerName', user.fullName || "Authorized Agent");
    setIfExists('slipPartnerPhone', user.contact || "N/A");
    setIfExists('slipPartnerEmail', user.email || "N/A");

    // ৪. QR কোড জেনারেশন
    const trackLink = `https://study-abroad-crm-nine.vercel.app/track.html?passport=${appData.passportNo}`;
    const qrEl = document.getElementById('slipQR');
    if(qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackLink)}`;

    // ৫. মডাল দেখানো
    const modal = document.getElementById('slipModal');
    if(modal) modal.style.display = 'flex';
}
// --- 6. UTILS & EXPOSE ---
// আপনার জাভাস্ক্রিপ্ট ফাইলের printSlip ফাংশনটি এভাবে আপডেট করুন
function printSlip() {
    const slipContent = document.getElementById('slipModal').innerHTML; // স্লিপ মডালের ভেতরের অংশ
    const printWindow = window.open('', '', 'height=800,width=1000');
    
    printWindow.document.write('<html><head><title>Print Admission Slip</title>');
    // বর্তমান পেজের সব স্টাইলশিট কপি করা যাতে প্রিন্ট ভিউ সুন্দর থাকে
    const styles = document.getElementsByTagName('style');
    for (let style of styles) { printWindow.document.write(style.outerHTML); }
    const links = document.getElementsByTagName('link');
    for (let link of links) { if (link.rel === 'stylesheet') printWindow.document.write(link.outerHTML); }
    
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="print-container">' + slipContent + '</div>');
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    
    // অল্প সময় অপেক্ষা করা যাতে ইমেজ (QR Code/Logo) লোড হতে পারে
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 1000);
}
window.printSlip = printSlip;

window.openManualApply = () => {
    const uniName = prompt("Enter University Name:", "Direct Admission");
    if (!uniName) return;

    selectedUniversity = uniName;
    currentUniCommission = 5000; 

    document.getElementById('modalTitle').innerText = "Manual: " + uniName;
    document.getElementById('sName').value = "";
    document.getElementById('sPassport').value = "";
    document.getElementById('applyModal').style.display = 'flex';

    console.log("Manual Mode Activated:", uniName, "Comm: 5000");
}; 

// --- এখান থেকে নতুন কোডগুলো পেস্ট করুন (কোনো কিছু না মুছে) ---

async function generateAssessmentPDF(uniData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const partner = JSON.parse(localStorage.getItem('user')) || {};

    // ১. লোগো যোগ করা (SCC লোগো বামে, পার্টনার লোগো ডানে)
    try {
        doc.addImage('logo.jpeg', 'JPEG', 10, 10, 25, 12); 
    } catch(e) { console.log("SCC Logo not found"); }

    if(partner.logoUrl) {
        try {
            doc.addImage(partner.logoUrl, 'PNG', 170, 10, 25, 12);
        } catch(e) { console.log("Partner Logo not found"); }
    }

    doc.setDrawColor(241, 196, 15); // গোল্ডেন লাইন
    doc.line(10, 25, 200, 25);

    doc.setFontSize(16);
    doc.setTextColor(26, 26, 46);
    doc.text("Admission Eligibility Report", 70, 40);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Agency: ${partner.orgName || 'Authorized Partner'}`, 10, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 170, 50);

    // ২. এসেসমেন্ট টেবিল
    doc.autoTable({
        startY: 60,
        head: [['Category', 'Details']],
        body: [
            ['University', uniData.name || 'N/A'],
            ['Country', uniData.country || 'N/A'],
            ['Course Name', uniData.courseName || 'Selected Program'],
            ['Tuition Fee', uniData.tuition || 'TBA'],
            ['Scholarship', uniData.scholarship || 'As per Eligibility'],
            ['Min Requirements', `GPA: ${uniData.minGPA} | IELTS/English: ${uniData.minScore}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [43, 0, 84] } // SCC Dark Blue Theme
    });

    // ৩. ফুটার সেকশন
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Next Steps:", 10, finalY);
    doc.setFontSize(9);
    doc.text("1. Contact your agent for document submission.", 10, finalY + 7);
    doc.text("2. Keep your Passport and Academic Transcripts ready.", 10, finalY + 12);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Disclaimer: This is a preliminary assessment based on provided data. Final decision rests with the university.", 10, 285);
    
    doc.save(`${uniData.name || 'Assessment'}_Report.pdf`);
}

function getCommissionText(amount) {
    return amount ? `৳${amount}` : "Consult for Profit";
}
