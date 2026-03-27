// Partner Portal Core Logic
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = userData.email ? userData.email.toLowerCase().trim() : null;

let currentUniCommission = 0;
let selectedUniversity = "";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

export async function initRealtimeData() {
    if(!partnerEmail) return;
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        // ইমেইল ফিল্টার আরও নিরাপদ করা হলো
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingBalance = 0; 
        let finalBalance = 0;   
        let html = "";

        myApps.forEach(data => {
            if (data.status === 'DOC_VERIFIED' || data.isVerified === true) {
                pendingBalance += Number(data.commissionBDT || 0);
            }
            if (data.status === 'PAID') {
                finalBalance += Number(data.commissionBDT || 0);
            }

            html += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td><span style="color:#f1c40f">${data.status}</span></td>
                <td>${data.university || 'N/A'}</td>
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px;" onclick='printAdmissionSlip(${JSON.stringify(data)})'>Slip</button></td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5'>No activity</td></tr>";
    } catch (e) { console.error("Error loading dashboard:", e); }
}

export async function initTracking() {
    const container = document.getElementById('fullTrackingBody');
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myStudents = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let html = "";
        myStudents.forEach(s => {
            html += `<tr>
                <td><b>${s.studentName}</b></td>
                <td>${s.studentContact || 'N/A'}</td>
                <td>${s.passportNo}</td>
                <td><span class="status-pill" style="color:var(--gold); border: 1px solid var(--gold); padding: 2px 8px; border-radius: 10px;">${s.status}</span></td>
                <td>${s.handledBy || 'SCC Compliance'}</td>
                <td>${new Date(s.timestamp).toLocaleDateString()}</td>
            </tr>`;
        });
        container.innerHTML = html || "<tr><td colspan='6'>No students found.</td></tr>";
    } catch (e) { console.error("Error loading tracking:", e); }
}

export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const sContact = document.getElementById('sContact').value;
    
    if(!sName || !sPass) return alert("Fill Student Name & Passport");

    try {
        const submitBtn = document.querySelector('button[onclick="submitApplication()"]');
        submitBtn.innerText = "Uploading Docs...";
        submitBtn.disabled = true;

        const fileIds = ['file1', 'file2', 'file3'];
        const urls = await Promise.all(fileIds.map(id => {
            const file = document.getElementById(id).files[0];
            return file ? uploadFile(file) : null;
        }));

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: sName, 
                passportNo: sPass,
                studentContact: sContact,
                university: selectedUniversity, 
                partnerEmail,
                commissionBDT: currentUniCommission,
                pdf1: urls[0], 
                pdf2: urls[1], 
                pdf3: urls[2],
                status: 'PENDING',
                timestamp: new Date().toISOString()
            })
        });

        if(res.ok) {
            alert("Application Submitted Successfully!");
            location.reload();
        }
    } catch (e) { 
        alert("Submission failed."); 
        console.error(e);
    }
}

export function printAdmissionSlip(appData) {
    const modal = document.getElementById('slipModal');
    document.getElementById('slipName').innerText = appData.studentName;
    document.getElementById('slipPassport').innerText = appData.passportNo;
    document.getElementById('slipAgency').innerText = userData.fullName || userData.name || "Authorized Partner";
    
    if(userData.logoURL) document.getElementById('slipPartnerLogo').src = userData.logoURL;

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: `https://study-abroad-crm-nine.vercel.app/track.html?id=${appData._id}`,
        width: 100, height: 100, colorDark: "#2b0054"
    });
    modal.style.display = 'flex';
}

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
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.minGPA} GPA / ${u.ieltsReq} Req.</td>
                    <td><b style="color:${isEligible ? '#2ecc71':'#ff4757'}">${isEligible ? '✅ ELIGIBLE':'❌ NOT ELIGIBLE'}</b></td>
                    <td>৳${totalFee.toLocaleString()}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" ${!isEligible ? 'disabled style="opacity:0.4"':''} onclick="window.openApplyModal('${u.universityName}', ${comm})">APPLY</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='6'>No results found</td></tr>";
    } catch (e) { console.error(e); }
}

export async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    const logoFile = document.getElementById('pLogo').files[0];
    let logoURL = userData.logoURL;
    try {
        if(logoFile) logoURL = await uploadFile(logoFile);
        const res = await fetch('/api/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, contact, logoURL })
        });
        if(res.ok) {
            localStorage.setItem('user', JSON.stringify({...userData, contact, logoURL}));
            alert("Profile Updated!");
            location.reload();
        }
    } catch (e) { alert("Failed to update profile"); }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

export function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = "Apply to: " + name;
    document.getElementById('applyModal').style.display = 'flex';
}
