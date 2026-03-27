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
    const userScore = parseFloat(document.getElementById('userScore').value) || 0;
    const userGap = parseFloat(document.getElementById('userGap').value) || 0;
    
    const container = document.getElementById('uniListContainer');
    container.innerHTML = "<tr><td colspan='5'>Searching...</td></tr>";
    
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        let html = "";

        unis.forEach(u => {
            // ১. কান্ট্রি ফিল্টার
            if (!country || u.country.toLowerCase().includes(country)) {
                
                // শর্তসমূহ (Eligibility Logic)
                const isGpaOk = userGPA >= (parseFloat(u.minGPA) || 0);
                const isScoreOk = userScore >= (parseFloat(u.ieltsReq) || 0);
                const isGapOk = userGap <= (parseFloat(u.gap) || 99); // গ্যাপ এডমিনের লিমিটের সমান বা কম হতে হবে

                const isEligible = isGpaOk && isScoreOk && isGapOk;

                // কমিশন ক্যালকুলেশন
                const totalFee = (Number(u.semesterFee) || 0) * 120;
                const comm = (totalFee * (Number(u.partnerComm) || 0)) / 100;

                // বাটন এবং স্ট্যাটাস ডিজাইন
                const statusText = isEligible ? 
                    `<b style="color:#2ecc71">✅ ELIGIBLE</b>` : 
                    `<b style="color:#ff4757">❌ NOT ELIGIBLE</b>`;
                
                const applyButton = isEligible ? 
                    `<button class="btn-gold" style="width:auto; padding:5px 10px;" onclick="openApplyModal('${u.universityName}', ${comm})">Apply Now</button>` : 
                    `<button class="btn-gold" style="width:auto; padding:5px 10px; background:#444; cursor:not-allowed;" disabled>Locked</button>`;

                html += `<tr>
                    <td>
                        <b>${u.universityName}</b><br>
                        <small>${u.country} | ${u.degree || 'Bachelor'}</small>
                    </td>
                    <td>
                        <small>Min GPA: ${u.minGPA || 'N/A'}</small><br>
                        <small>Language: ${u.ieltsReq || 'N/A'}</small><br>
                        <small>Max Gap: ${u.gap || 'N/A'} yrs</small>
                    </td>
                    <td>${statusText}</td>
                    <td style="color:var(--gold)">৳${comm.toLocaleString()}</td>
                    <td>${applyButton}</td>
                </tr>`;
            }
        });
        container.innerHTML = html || "<tr><td colspan='5'>No Universities Found for this country.</td></tr>";
    } catch (e) { 
        console.error("Search Error:", e);
        container.innerHTML = "<tr><td colspan='5'>Error loading data.</td></tr>";
    }
}

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

async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    const btn = document.querySelector('button[onclick="submitApplication()"]');

    if(!sName || !sPass) return alert("Please enter Student Name and Passport No.");

    // ইনপুট ফাইল এলিমেন্টগুলো ধরা
    const fileInput1 = document.getElementById('file1');
    const fileInput2 = document.getElementById('file2');

    // ফাইল সিলেক্ট করা হয়েছে কি না নিশ্চিত করা
    if (!fileInput1.files[0] || !fileInput2.files[0]) {
        return alert("Please select both Passport and Academic documents.");
    }

    try {
        btn.innerText = "Uploading Documents...";
        btn.disabled = true;

        // ফাইলগুলো আলাদাভাবে আপলোড করা এবং লিঙ্ক পাওয়া
        const url1 = await uploadFile(fileInput1.files[0]);
        const url2 = await uploadFile(fileInput2.files[0]);

        // যদি কোনো কারণে আপলোড ফেইল করে
        if(!url1 || !url2) {
            throw new Error("Could not get file links from Cloudinary.");
        }

        console.log("Uploaded URLs:", url1, url2); // কনসোলে লিঙ্ক চেক করার জন্য

        const payload = {
            studentName: sName,
            passportNo: sPass,
            university: selectedUniversity, 
            partnerEmail: partnerEmail,
            commissionBDT: currentUniCommission,
            pdf1: url1, // এখানে এখন সরাসরি লিঙ্ক যাবে
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
            alert("✅ Application Submitted with Documents!");
            location.reload();
        } else {
            alert("❌ Server rejected the application.");
        }
    } catch (e) {
        console.error("Upload Error:", e);
        alert("❌ Error: " + e.message);
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
