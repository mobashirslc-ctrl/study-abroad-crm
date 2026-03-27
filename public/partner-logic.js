// Global Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";

// ১. ড্যাশবোর্ড ডাটা লোড (Realtime)
async function initRealtimeData() {
    if(!partnerEmail) return;
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingBalance = 0; 
        let finalBalance = 0;   
        let html = "";

        myApps.forEach(data => {
            if (data.status === 'DOC_VERIFIED' || data.status === 'VERIFIED') pendingBalance += Number(data.pendingAmount || 0);
            if (data.status === 'PAID') finalBalance += Number(data.commissionBDT || 0);

            html += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td><span style="color:var(--gold)">${data.status}</span></td>
                <td>${data.university || 'N/A'}</td>
                <td><button class="btn-gold" style="padding:5px 10px; width:auto; font-size:11px;" onclick='viewSlip("${data._id}")'>Slip</button></td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5'>No records found</td></tr>";
    } catch (e) { console.error("Dashboard Error", e); }
}

// ২. ইউনিভার্সিটি সার্চ এবং এলিজিবিলিটি (Updated Logic)
async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const userGPA = parseFloat(document.getElementById('userGPA').value) || 0;
    const userScore = parseFloat(document.getElementById('userScore').value) || 0;
    const userGap = parseFloat(document.getElementById('userGap').value) || 0;
    
    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='5'>Searching...</td></tr>";
    
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                
                // Eligibility Comparison
                const isGpaOk = userGPA >= (u.minGPA || 0);
                const isScoreOk = userScore >= (u.ieltsReq || 0);
                const isGapOk = userGap <= (u.gap || 0);

                const isEligible = isGpaOk && isScoreOk && isGapOk;

                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                const statusText = isEligible ? `<b style="color:#2ecc71">✅ ELIGIBLE</b>` : `<b style="color:#ff4757">❌ NOT ELIGIBLE</b>`;
                const applyBtn = isEligible ? 
                    `<button class="btn-gold" style="width:auto; padding:5px 10px;" onclick="openApplyModal('${u.universityName}', ${comm})">Apply</button>` : 
                    `<button class="btn-gold" style="width:auto; padding:5px 10px; background:#444; cursor:not-allowed;" disabled>Locked</button>`;

                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country} | ${u.degree}</small></td>
                    <td><small>GPA:${u.minGPA}+ | Score:${u.ieltsReq}+ | Gap:${u.gap}y</small></td>
                    <td>${statusText}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td>${applyBtn}</td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='5'>No results found</td></tr>";
    } catch (e) { console.error(e); }
}

// ৩. ফাইল আপলোড লজিক (Cloudinary)
async function uploadFile(file) {
    if(!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url || "";
}

// ৪. ৪টি ফাইল আপলোড সহ সাবমিশন
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPass) return alert("Fill student details!");

    try {
        btn.innerText = "Uploading 4 Files...";
        btn.disabled = true;

        // ৪টি ফাইল বক্স থেকে ফাইল ধরা
        const f1 = document.getElementById('file1').files[0];
        const f2 = document.getElementById('file2').files[0];
        const f3 = document.getElementById('file3').files[0];
        const f4 = document.getElementById('file4').files[0];

        if(!f1 || !f2) return alert("Passport and Academic files are mandatory!");

        // প্যারালাল আপলোড (দ্রুত কাজ করার জন্য)
        const [url1, url2, url3, url4] = await Promise.all([
            uploadFile(f1), uploadFile(f2), uploadFile(f3), uploadFile(f4)
        ]);

        const payload = {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity,
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission,
            pdf1: url1, pdf2: url2, pdf3: url3, pdf4: url4,
            status: 'PENDING'
        };

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Successfully Submitted!");
            location.reload();
        }
    } catch (e) {
        alert("Upload Failed: " + e.message);
    } finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
}

function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
}
