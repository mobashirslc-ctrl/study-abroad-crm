// Global Configuration & State
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

// Local Storage থেকে ইউজার ডাটা নেওয়া
const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentUniCommission = 0;
let selectedUniversity = "";

// ১. ড্যাশবোর্ড ডাটা লোড (Realtime Data)
async function initRealtimeData() {
    if(!partnerEmail) return;
    try {
        const res = await fetch('/api/applications');
        const allApps = await res.json();
        
        // শুধুমাত্র এই পার্টনারের অ্যাপ্লিকেশন ফিল্টার করা
        const myApps = allApps.filter(app => (app.partnerEmail || "").toLowerCase().trim() === partnerEmail);

        let pendingBalance = 0; 
        let finalBalance = 0;   
        let html = "";

        myApps.forEach(data => {
            // ব্যালেন্স ক্যালকুলেশন
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
                <td><button class="btn-gold" style="padding:5px 10px; font-size:11px; width:auto;" onclick='printAdmissionSlip(${JSON.stringify(data)})'>Slip</button></td>
            </tr>`;
        });

        document.getElementById('topPending').innerText = `৳${pendingBalance.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${finalBalance.toLocaleString()}`;
        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5'>No activity found</td></tr>";
    } catch (e) { 
        console.error("Dashboard Error:", e);
        document.getElementById('homeTrackingBody').innerHTML = "<tr><td colspan='5' style='color:red'>Connection Error!</td></tr>";
    }
}

// ২. ফুল ট্র্যাকিং লিস্ট
async function initTracking() {
    const container = document.getElementById('fullTrackingBody');
    if(!container) return;
    
    container.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
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
                <td><span style="border:1px solid #f1c40f; padding:2px 5px; border-radius:5px;">${s.status}</span></td>
                <td>${s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'N/A'}</td>
            </tr>`;
        });
        container.innerHTML = html || "<tr><td colspan='5'>No students found.</td></tr>";
    } catch (e) { console.error("Tracking Error:", e); }
}

// ৩. ইউনিভার্সিটি সার্চ এবং এলিজিবিলিটি
async function searchUni() {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const userGPA = parseFloat(document.getElementById('userGPA').value) || 0;
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='4'>Searching...</td></tr>";
    
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            if (!country || u.country.toLowerCase().includes(country)) {
                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;
                const isEligible = userGPA >= (parseFloat(u.minGPA) || 0);

                html += `<tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td><b style="color:${isEligible ? '#2ecc71':'#ff4757'}">${isEligible ? '✅ YES':'❌ LOW GPA'}</b></td>
                    <td style="color:#f1c40f">৳${comm.toLocaleString()}</td>
                    <td><button class="btn-gold" style="width:auto; padding:5px 10px;" onclick="openApplyModal('${u.universityName}', ${comm})">Apply</button></td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='4'>No Universities Found</td></tr>";
    } catch (e) { console.error("Search Error:", e); }
}

// ৪. ফাইল আপলোড লজিক (Cloudinary)
async function uploadFile(file) {
    if(!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

// ৫. অ্যাপ্লিকেশন সাবমিট
async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.querySelector('button[onclick="submitApplication()"]');

    if(!sName || !sPass) return alert("Please enter Student Name and Passport No.");

    try {
        btn.innerText = "Uploading Documents...";
        btn.disabled = true;

        // ফাইলগুলো আপলোড করা
        const f1 = document.getElementById('file1').files[0];
        const f2 = document.getElementById('file2').files[0];
        
        const url1 = await uploadFile(f1);
        const url2 = await uploadFile(f2);

        const payload = {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity,
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission,
            pdf1: url1,
            pdf2: url2,
            status: 'PENDING',
            timestamp: new Date().toISOString()
        };

        const res = await fetch('/api/submit-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Application Submitted Successfully!");
            location.reload();
        } else {
            alert("❌ Submission Failed.");
        }
    } catch (e) {
        console.error(e);
        alert("Error connecting to server.");
    } finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
}

// ৬. প্রোফাইল আপডেট
async function updateProfile() {
    const contact = document.getElementById('pContact').value;
    try {
        const res = await fetch('/api/update-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: partnerEmail, contact: contact })
        });
        if(res.ok) {
            userData.contact = contact;
            localStorage.setItem('user', JSON.stringify(userData));
            alert("✅ Profile Updated!");
        }
    } catch (e) { alert("Failed to update."); }
}

// ৭. স্লিপ প্রিন্ট এবং QR Code
function printAdmissionSlip(appData) {
    const modal = document.getElementById('slipModal');
    if(!modal) return alert("Printing slip..."); // Fallback if modal not in HTML

    document.getElementById('slipName').innerText = appData.studentName;
    document.getElementById('slipPassport').innerText = appData.passportNo;
    document.getElementById('slipAgency').innerText = userData.name || "SCC Partner";

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: `https://scc-portal.vercel.app/track?id=${appData._id}`,
        width: 100, height: 100
    });

    modal.style.display = 'flex';
}

// ৮. মোডাল ওপেন লজিক
function openApplyModal(name, comm) {
    selectedUniversity = name;
    currentUniCommission = comm;
    document.getElementById('modalTitle').innerText = "Apply to: " + name;
    document.getElementById('applyModal').style.display = 'flex';
}
