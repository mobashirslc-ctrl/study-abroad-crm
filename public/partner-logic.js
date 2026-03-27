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
            // ব্যালেন্স ক্যালকুলেশন
            if (data.status === 'DOC_VERIFIED' || data.status === 'VERIFIED') pendingBalance += Number(data.pendingAmount || 0);
            if (data.status === 'PAID') finalBalance += Number(data.commissionBDT || 0);

            html += `<tr>
                <td><b>${data.studentName}</b></td>
                <td>${data.passportNo}</td>
                <td><span class="badge" style="background:#252545; color:var(--gold)">${data.status}</span></td>
                <td>${data.university || 'N/A'}</td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('totalStudents').innerText = myApps.length;
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='4'>No records found</td></tr>";
    } catch (e) { console.error("Dashboard Error", e); }
}

// ২. ইউনিভার্সিটি সার্চ এবং এলিজিবিলিটি (Updated with New Fields)
async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const userGPA = parseFloat(document.getElementById('userGPA').value) || 0;
    const userScore = parseFloat(document.getElementById('userScore').value) || 0;
    const userGap = parseFloat(document.getElementById('userGap').value) || 0;
    
    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='7'>Searching Universities...</td></tr>";
    
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                
                // Eligibility Logic
                const isGpaOk = userGPA >= (u.minGPA || 0);
                const isScoreOk = userScore >= (u.ieltsReq || 0);
                const isGapOk = userGap <= (u.gap || 0);
                const isEligible = isGpaOk && isScoreOk && isGapOk;

                // Commission Calculation (Assuming 120 is exchange rate)
                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                const statusBadge = isEligible ? 
                    `<span class="badge eligible">✅ ELIGIBLE</span>` : 
                    `<span class="badge not-eligible">❌ NOT ELIGIBLE</span>`;

                const applyBtn = isEligible ? 
                    `<button class="btn-gold" style="padding:6px 12px;" onclick="openApplyModal('${u.universityName}', ${comm})">Apply Now</button>` : 
                    `<button class="btn-gold" style="background:#333; color:#777; cursor:not-allowed;" disabled>Locked</button>`;

                html += `<tr>
                    <td>
                        <b>${u.universityName}</b><br>
                        <small style="color:#aaa;"><i class="fas fa-map-marker-alt"></i> ${u.location || u.country}</small>
                    </td>
                    <td>
                        <small>GPA: ${u.minGPA}+</small><br>
                        <small>Score: ${u.ieltsReq}+</small><br>
                        <small>Gap: ${u.gap || 0}y Max</small>
                    </td>
                    <td>
                        <b>$${u.semesterFee.toLocaleString()}</b><br>
                        <small style="color:#aaa;">Duration: ${u.duration || 'N/A'}</small>
                    </td>
                    <td>
                        <small>Living: $${u.livingCost || '0'}/y</small><br>
                        <span style="font-size:10px; padding:2px 5px; background:#444; border-radius:3px;">${u.jobOpportunity || 'Standard'} Jobs</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="color:var(--gold); font-weight:bold;">৳${comm.toLocaleString()}</td>
                    <td>${applyBtn}</td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='7'>No universities found matching your criteria.</td></tr>";
    } catch (e) { 
        console.error(e); 
        container.innerHTML = "<tr><td colspan='7'>Error loading data.</td></tr>";
    }
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

// ৪. স্টুডেন্ট সাবমিশন
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.getElementById('submitBtn');

    if(!sName || !sPass) return alert("Please enter student name and passport number!");

    try {
        btn.innerText = "Processing Files...";
        btn.disabled = true;

        const f1 = document.getElementById('file1').files[0];
        const f2 = document.getElementById('file2').files[0];
        const f3 = document.getElementById('file3').files[0];
        const f4 = document.getElementById('file4').files[0];

        if(!f1 || !f2) return alert("Passport Copy and Academic Records are mandatory!");

        // Uploading all files in parallel
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
            status: 'PENDING',
            date: new Date().toISOString()
        };

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Student application submitted successfully!");
            location.reload();
        }
    } catch (e) {
        alert("Submission Failed: " + e.message);
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

function initTracking() {
    // This will fetch full history for the tracking tab
    initRealtimeData(); 
}
