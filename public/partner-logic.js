// Partner Portal Core Logic
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = userData.email ? userData.email.toLowerCase().trim() : null;

let currentUniCommission = 0;
let selectedUniversity = "";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

// ১. ড্যাশবোর্ড ডাটা লোড
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
                <td><span style="color:#f1c40f">${data.status}</span></td>
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

// ২. লাইভ ট্র্যাকিং মেনু
export async function initTracking() {
    const container = document.getElementById('fullTrackingBody');
    container.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Loading Tracks...</td></tr>";
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myStudents = allApps.filter(app => app.partnerEmail === partnerEmail);

        let html = "";
        myStudents.forEach(s => {
            html += `<tr>
                <td><b>${s.studentName}</b><br><small>${s.university}</small></td>
                <td>${s.handledBy || 'SCC Compliance'}</td>
                <td>${s.passportNo}</td>
                <td><span class="status-pill" style="color:var(--gold)">${s.status}</span></td>
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;" onclick="window.open('track.html?id=${s._id}', '_blank')">Track</button></td>
            </tr>`;
        });
        container.innerHTML = html || "<tr><td colspan='5'>No students found.</td></tr>";
    } catch (e) { }
}

// ৩. প্রোফাইল আপডেট (Database Sync)
export async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    const logoFile = document.getElementById('pLogo').files[0];
    let logoURL = userData.logoURL;

    try {
        if(logoFile) {
            alert("Uploading Logo...");
            logoURL = await uploadFile(logoFile);
        }
        const res = await fetch('/api/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, contact, logoURL })
        });
        if(res.ok) {
            localStorage.setItem('user', JSON.stringify({...userData, contact, logoURL}));
            alert("Profile Updated Successfully!");
            location.reload();
        }
    } catch (e) { alert("Failed to update profile"); }
}

// ৪. অ্যাডমিশন স্লিপ জেনারেশন
export function printAdmissionSlip(appData) {
    document.getElementById('slipName').innerText = appData.studentName;
    document.getElementById('slipPassport').innerText = appData.passportNo;
    document.getElementById('slipAgency').innerText = userData.fullName || userData.name || "Authorized Partner";
    document.getElementById('slipDate').innerText = new Date().toLocaleDateString();
    
    if(userData.logoURL) document.getElementById('slipPartnerLogo').src = userData.logoURL;

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: `https://study-abroad-crm-nine.vercel.app/track.html?id=${appData._id}`,
        width: 80, height: 80, colorDark: "#2b0054"
    });
    document.getElementById('slipModal').style.display = 'block';
}

// ইউনিভার্সিটি সার্চ লজিক
export async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const degree = document.getElementById('fDegree').value;
    const userGPA = parseFloat(document.getElementById('userGPA').value) || 0;
    const userScore = parseFloat(document.getElementById('userScore').value) || 0;

    const container = document.getElementById('uniListContainer');
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";
        unis.forEach(u => {
            if ((!country || u.country.toLowerCase().includes(country)) && (!degree || u.degree === degree)) {
                const isEligible = (userGPA >= parseFloat(u.minGPA) || 0) && (userScore >= parseFloat(u.ieltsReq) || 0);
                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                html += `<tr>
                    <td><b>${u.universityName}</b></td>
                    <td>${u.minGPA} GPA / ${u.ieltsReq} Req.</td>
                    <td><b style="color:${isEligible ? '#2ecc71':'#ff4757'}">${isEligible ? '✅ ELIGIBLE':'❌ NO'}</b></td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" ${!isEligible ? 'disabled style="opacity:0.4"':''} onclick="window.openApplyModal('${u.universityName}', ${comm})">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='6'>No results found</td></tr>";
    } catch (e) { }
}

// হেল্পার ফাংশন
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

// অ্যাপ্লিকেশন সাবমিট
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    if(!sName || !sPass) return alert("Fill Name & Passport");

    try {
        const fileIds = ['file1', 'file2', 'file3'];
        const urls = await Promise.all(fileIds.map(id => {
            const file = document.getElementById(id).files[0];
            return file ? uploadFile(file) : null;
        }));

        await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, passportNo: sPass,
                university: selectedUniversity, partnerEmail,
                commissionBDT: currentUniCommission,
                pendingAmount: 0, // Compliance verify করলে বাড়বে
                pdf1: urls[0], pdf2: urls[1], pdf3: urls[2],
                status: 'PENDING'
            })
        });
        alert("Application Submitted!");
        location.reload();
    } catch (e) { alert("Submission failed"); }
}

window.openApplyModal = (name, comm) => {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = "Apply: " + name;
    document.getElementById('applyModal').style.display = 'block';
};
