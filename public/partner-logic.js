const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = userData.email ? userData.email.toLowerCase().trim() : null;

let currentUniCommission = 0;
let selectedUniversity = "";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

// ১. রিয়েল-টাইম ড্যাশবোর্ড আপডেট
export async function initRealtimeData() {
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => app.partnerEmail === partnerEmail);

        let pending = 0, final = 0, html = "";
        myApps.forEach(data => {
            pending += Number(data.pendingAmount || 0);
            final += Number(data.finalAmount || 0);
            html += `<tr>
                <td>${data.studentName}</td>
                <td><span style="color:${getStatusColor(data.status)}">${data.status}</span></td>
                <td>${new Date(data.timestamp).toLocaleDateString()}</td>
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;" onclick='printAdmissionSlip(${JSON.stringify(data)})'>Slip</button></td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='4'>No activity</td></tr>";
        document.getElementById('withdrawFinalBalance').innerText = `৳${final.toLocaleString()}`;
    } catch (e) { console.error(e); }
}

// ২. উন্নত অ্যাসেসমেন্ট লজিক (Language & Scoreসহ)
export async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const degree = document.getElementById('fDegree').value;
    const userGPA = parseFloat(document.getElementById('userGPA').value) || 0;
    const userScore = parseFloat(document.getElementById('userScore').value) || 0;
    const userLang = document.getElementById('userLang').value;

    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching...</td></tr>";

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "", found = false;

        unis.forEach(u => {
            if ((!country || u.country.toLowerCase().includes(country)) && (!degree || u.degree === degree)) {
                found = true;
                const minGPA = parseFloat(u.minGPA) || 0;
                const minIELTS = parseFloat(u.ieltsReq) || 0;
                
                // Eligibility Logic
                const isEligible = (userGPA >= minGPA) && (userScore >= minIELTS);
                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.minGPA} GPA / ${u.ieltsReq} Req.</td>
                    <td><b style="color:${isEligible ? '#2ecc71':'#ff4757'}">${isEligible ? '✅ ELIGIBLE':'❌ NOT ELIGIBLE'}</b></td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" ${!isEligible ? 'disabled style="opacity:0.4"':''} onclick="openApplyModal('${u.universityName}', ${comm})">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = found ? html : "<tr><td colspan='6'>No University Found</td></tr>";
    } catch (e) { container.innerHTML = "Error loading."; }
}

// ৩. স্লিপ জেনারেশন ও QR Code
export function printAdmissionSlip(appData) {
    document.getElementById('slipName').innerText = appData.studentName;
    document.getElementById('slipPassport').innerText = appData.passportNo;
    document.getElementById('slipAgency').innerText = userData.fullName || "Partner";
    document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
    
    // QR Code Generation
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    const trackURL = `https://study-abroad-crm-nine.vercel.app/track.html?id=${appData._id}`;
    
    new QRCode(qrContainer, {
        text: trackURL,
        width: 80,
        height: 80,
        colorDark: "#2b0054"
    });

    document.getElementById('slipModal').style.display = 'block';
}

// ৪. অ্যাপ্লিকেশন সাবমিশন
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Fill Name & Passport");

    const btn = document.querySelector('#applyModal .btn-gold');
    btn.innerText = "Uploading Files..."; btn.disabled = true;

    try {
        const fileIds = ['file1', 'file2', 'file3', 'file4'];
        const urls = await Promise.all(fileIds.map(id => {
            const file = document.getElementById(id).files[0];
            return file ? uploadFile(file) : null;
        }));

        const response = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, passportNo: sPass,
                university: selectedUniversity, partnerEmail,
                commissionBDT: currentUniCommission,
                pendingAmount: currentUniCommission,
                pdf1: urls[0], pdf2: urls[1], pdf3: urls[2], pdf4: urls[3],
                status: 'PENDING'
            })
        });

        if(response.ok) { alert("Submitted!"); location.reload(); }
    } catch (e) { alert("Error!"); }
}

// হেল্পার ফাংশনস
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

function getStatusColor(s) {
    if(s === 'PENDING') return '#f1c40f';
    if(s === 'VERIFIED' || s === 'APPROVED') return '#2ecc71';
    if(s === 'REJECTED') return '#e74c3c';
    return '#fff';
}

// গ্লোবাল উইন্ডো ফাংশন
window.openApplyModal = (name, comm) => {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = "Apply: " + name;
    document.getElementById('applyModal').style.display = 'block';
};

export async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    const logoFile = document.getElementById('pLogo').files[0];
    let logoURL = userData.logoURL;
    if(logoFile) logoURL = await uploadFile(logoFile);

    const res = await fetch('/api/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: partnerEmail, contact, logoURL })
    });
    if(res.ok) {
        localStorage.setItem('user', JSON.stringify({...userData, contact, logoURL}));
        alert("Profile Updated!");
    }
}

export async function requestWithdraw() {
    const amount = document.getElementById('wdAmount').value;
    if(!amount || amount <= 0) return alert("Invalid Amount");
    const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            partnerEmail, amount: Number(amount),
            method: document.getElementById('wdMethod').value,
            details: document.getElementById('wdDetails').value
        })
    });
    if(res.ok) alert("Request Sent!");
}
