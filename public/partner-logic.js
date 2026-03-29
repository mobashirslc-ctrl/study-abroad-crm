/**
 * SCC Group - Partner Portal Logic (2026)
 * Full Integration: MongoDB, Cloudinary, QR Tracking & Wallet
 * Status: FINAL VERIFIED & OPTIMIZED
 */

// 1. Global Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";
let currentAvailableBalance = 0; 

// ---------------------------------------------------------
// 2. Initialization on Load
// ---------------------------------------------------------
window.onload = () => {
    if(!partnerEmail) {
        window.location.href = 'index.html';
        return;
    }

    // ফাংশনগুলোকে গ্লোবাল উইন্ডোতে এক্সপোজ করা (HTML থেকে কল করার জন্য)
    window.searchUni = searchUni;
    window.openApplyModal = openApplyModal;
    window.submitApplication = submitApplication;
    window.requestWithdraw = requestWithdraw;
    window.logout = logout;
    window.saveProfile = saveProfile;
    window.uploadPartnerLogo = uploadPartnerLogo; // নতুন যোগ করা হয়েছে

    document.getElementById('welcomeName').innerText = userData.name || "Partner";
    document.getElementById('pEmail').value = partnerEmail;
    document.getElementById('pOrg').value = userData.orgName || userData.name || "";
    
    // প্রোফাইল ফিল্ডগুলো রেন্ডার করা
    if(document.getElementById('pAuth')) document.getElementById('pAuth').value = userData.authorisedPerson || "";
    if(document.getElementById('pPhone')) document.getElementById('pPhone').value = userData.contact || "";
    if(document.getElementById('pAddr')) document.getElementById('pAddr').value = userData.address || "";

    if(userData.logoUrl) {
        document.getElementById('currentLogo').src = userData.logoUrl;
        const sidebarLogo = document.getElementById('sidebarLogo');
        if(sidebarLogo) sidebarLogo.src = userData.logoUrl;
    }

    initRealtimeData(); 
};

// ---------------------------------------------------------
// 3. Core Logic: Dashboard & Wallet Tracking
// ---------------------------------------------------------
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

        // UI Updates
        document.getElementById('topPending').innerHTML = `<small style="font-size:10px; display:block; color:#aaa;">ESTIMATED EARNINGS</small> ৳${pendingTotal.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${currentAvailableBalance.toLocaleString()}`;
        document.getElementById('withdrawableBal').innerText = `৳${currentAvailableBalance.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;

        // Earnings tab updates
        if(document.getElementById('topPendingE')) document.getElementById('topPendingE').innerText = `৳${pendingTotal.toLocaleString()}`;
        if(document.getElementById('topFinalE')) document.getElementById('topFinalE').innerText = `৳${currentAvailableBalance.toLocaleString()}`;

        document.getElementById('homeTrackingBody').innerHTML = combinedHtml || "<tr><td colspan='5'>No records found</td></tr>";
        document.getElementById('fullTrackingBody').innerHTML = combinedHtml || "<tr><td colspan='5'>No history found</td></tr>";
        
    } catch (e) { console.error("Data Fetch Error:", e); }
}

// ---------------------------------------------------------
// 4. Withdraw & File Handling
// ---------------------------------------------------------
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
    if(!file) return;
    const url = await uploadFile(file);
    if(url) {
        document.getElementById('currentLogo').src = url;
        alert("Logo uploaded! Please save profile to confirm.");
    }
}

async function requestWithdraw() {
    const amount = document.getElementById('withdrawAmount').value;
    const method = document.getElementById('withdrawMethod').value;
    const details = document.getElementById('paymentDetails').value;

    if (amount < 500) return alert("Minimum 500 BDT required");
    if (amount > currentAvailableBalance) return alert("Insufficient balance");

    try {
        const res = await fetch('/api/withdrawals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: partnerEmail,
                amount: Number(amount),
                method: `${method}: ${details}`
            })
        });
        if(res.ok) { alert("Withdrawal request sent!"); location.reload(); }
    } catch (e) { alert("Error sending request"); }
}

// ---------------------------------------------------------
// 5. Submit Application & Search
// ---------------------------------------------------------
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPass) return alert("Student Name & Passport are mandatory!");

    try {
        btn.innerText = "Processing..."; btn.disabled = true;
        const docs = await Promise.all([
            uploadFile(document.getElementById('file1').files[0]),
            uploadFile(document.getElementById('file2').files[0]),
            uploadFile(document.getElementById('file3').files[0]),
            uploadFile(document.getElementById('file4').files[0])
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

        if(res.ok) { alert("Submitted!"); location.reload(); }
    } catch (e) { alert("Submission failed"); } 
    finally { btn.disabled = false; btn.innerText = "Submit Application"; }
}

async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const score = parseFloat(document.getElementById('userScore').value) || 0;
    const gap = parseInt(document.getElementById('userGap').value) || 0;
    
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";
        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const isEligible = gpa >= (u.minGPA || 0) && score >= (u.ieltsReq || 0) && gap <= (u.maxGapAllowed || 10);
                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                    <td>$${(u.totalTuitionFee || 0).toLocaleString()}</td>
                    <td><span class="badge" style="background:${isEligible ? '#2ecc71' : '#ff4757'}">${isEligible ? 'Eligible' : 'Not Eligible'}</span></td>
                    <td style="color:var(--gold);">৳${(u.commissionBDT || 0).toLocaleString()}</td>
                    <td><button class="btn-gold" ${!isEligible ? 'disabled' : ''} onclick="openApplyModal('${u.universityName}', ${u.commissionBDT})">Apply</button></td>
                </tr>`;
            }
        });
        document.getElementById('uniListContainer').innerHTML = html;
    } catch (e) { console.error(e); }
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
    if(res.ok) {
        alert("✅ Profile Updated!");
        localStorage.setItem('user', JSON.stringify({...userData, ...payload}));
    }
}

function openApplyModal(name, comm) {
    selectedUniversity = name; currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}

function logout() { localStorage.clear(); window.location.href='index.html'; }
