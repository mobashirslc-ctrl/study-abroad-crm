/**
 * Powered BY GORUN - Partner Portal Logic (2026)
 * Full Feature Set: Search, Eligibility, Dashboard, Wallet, Slip, & Submission
 */

// --- GLOBAL CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ddziennkh/image/upload";
const UPLOAD_PRESET = "ihp_upload";

const userData = JSON.parse(localStorage.getItem('user') || "{}");
const partnerEmail = (userData.email || "").toLowerCase().trim();

let currentAvailableBalance = 0;
let currentSelectedUniId = "";
let currentSelectedUniName = "";
let currentSelectedUniComm = 0;

const EXCHANGE_RATES = { 'USD': 121, 'AUD': 82, 'EUR': 132, 'GBP': 155, 'CAD': 89 };

// --- 1. INITIALIZATION ---
window.onload = async () => {
    if (!userData.email) {
        window.location.href = 'login.html';
        return;
    }
    
    // UI Setup
    if (document.getElementById('welcomeName')) document.getElementById('welcomeName').innerText = userData.fullName || userData.orgName || "Partner";
    if (document.getElementById('pEmail')) document.getElementById('pEmail').value = partnerEmail;

    const profileFields = { 'pOrg': 'orgName', 'pAuth': 'fullName', 'pPhone': 'contact' };
    for (let id in profileFields) {
        if (document.getElementById(id)) document.getElementById(id).value = userData[profileFields[id]] || "";
    }

    await initRealtimeData();
    await fetchUniversitiesForPartner();
};

// --- 2. DASHBOARD & WALLET SYNC ---
window.initRealtimeData = async function() {
    if (!partnerEmail) return;
    try {
        const [userRes, appRes] = await Promise.all([
            fetch(`/api/admin/users`), 
            fetch(`/api/applications?partnerEmail=${encodeURIComponent(partnerEmail)}`)
        ]);

        const allUsers = await userRes.json();
        const me = Array.isArray(allUsers) ? allUsers.find(u => (u.email || "").toLowerCase().trim() === partnerEmail) : null;
        
        // এখানে ব্যালেন্স সেট হচ্ছে
        currentAvailableBalance = me ? (Number(me.walletBalance) || 0) : 0;

        const myApps = await appRes.json();
        const safeApps = Array.isArray(myApps) ? myApps : [];
        
        let pendingTotal = 0;
        const tableRows = safeApps.map(app => {
            const status = (app.status || 'PENDING').toUpperCase();
            const comm = Number(app.commissionBDT || 0);
            if(status !== 'REJECTED' && status !== 'CANCELLED') pendingTotal += comm;

            return `
                <tr>
                    <td><b>${app.studentName}</b></td>
                    <td>${app.passportNo}</td>
                    <td>${app.university || 'N/A'}</td>
                    <td><span class="status-pill ${status.toLowerCase()}">${status}</span></td>
                    <td>৳${comm.toLocaleString()}</td>
                </tr>`;
        }).join('');

        // --- UI তে ডাটা বসানো শুরু ---
        const setTxt = (id, val) => { 
            const el = document.getElementById(id);
            if (el) el.innerText = val; 
        };
        
        setTxt('topPending', `৳${pendingTotal.toLocaleString()}`); 
        setTxt('topFinal', `৳${currentAvailableBalance.toLocaleString()}`); 
        setTxt('totalStudents', safeApps.length);

        // --- উইথড্র সেকশন আপডেট (এটিই আপনার মেইন প্রবলেম ছিল) ---
        // ১. উইথড্র বক্সের টেক্সট আপডেট
        setTxt('availableWithdrawBalance', currentAvailableBalance.toLocaleString());
        
        // ২. ইনপুট ফিল্ড এবং বাটন এনাবল করা
       const withdrawInput = document.getElementById('withdrawAmount');
        if(withdrawInput) {
            if(currentAvailableBalance > 0) {
                withdrawInput.disabled = false;
                withdrawInput.max = currentAvailableBalance;
                withdrawInput.placeholder = "Max: " + currentAvailableBalance;
            } else {
                withdrawInput.disabled = true;
                withdrawInput.placeholder = "Insufficient Balance";
            }
        }

        if (document.getElementById('quickStatsBody')) document.getElementById('quickStatsBody').innerHTML = tableRows;
        if (document.getElementById('fullTrackingBody')) document.getElementById('fullTrackingBody').innerHTML = tableRows;

    } catch (error) { 
        console.error("Dashboard Sync Error:", error); 
    }
};

// --- 3. UNIVERSITY LIST & SEARCH ---
window.fetchUniversitiesForPartner = async () => {
    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const tbody = document.getElementById('partnerUniTable');
        if (!tbody) return;

        tbody.innerHTML = unis.map(u => {
            const tuition = parseFloat(u.totalTuitionFee) || 0;
            const currency = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currency] || 115;
            const profit = Math.round((tuition * (u.commPercent || 0) / 100) * rate + (parseFloat(u.commFixedBDT) || 0));

            return `
            <tr>
                <td><b>${u.universityName}</b><br><small><i class="fas fa-map-marker-alt"></i> ${u.country}</small></td>
                <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                <td>${currency} ${tuition.toLocaleString()}</td>
                <td><b style="color:var(--green)">৳${profit.toLocaleString()}</b></td>
                <td>
                    <button class="btn-gold" onclick="window.openApplyModal('${u.universityName}', '${u._id}', ${profit})">APPLY NOW</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Uni List Error:", e); }
};

// Eligibility Search Function
window.searchUni = async () => {
    const country = document.getElementById('fCountry').value.trim().toLowerCase();
    const gpa = parseFloat(document.getElementById('userGPA').value) || 0;
    const score = parseFloat(document.getElementById('userScore').value) || 0;
    const container = document.getElementById('uniListContainer');

    if (!container || !country) return;

    try {
        const res = await fetch('/api/universities');
        const unis = await res.json();
        const filtered = unis.filter(u => u.country.toLowerCase().includes(country));

        container.innerHTML = filtered.map(u => {
            const isEligible = gpa >= (u.minGPA || 0) && score >= (u.ieltsReq || 0);
            const tuition = parseFloat(u.totalTuitionFee) || 0;
            const currency = (u.uCurrency || 'USD').toUpperCase();
            const rate = EXCHANGE_RATES[currency] || 115;
            const profit = Math.round((tuition * (u.commPercent || 0) / 100) * rate + (parseFloat(u.commFixedBDT) || 0));

            return `
            <tr>
                <td><b class="text-gold">${u.universityName}</b></td>
                <td>GPA: ${u.minGPA}+ | IELTS: ${u.ieltsReq}+</td>
                <td>${currency} ${tuition.toLocaleString()}</td>
                <td>৳${profit.toLocaleString()}</td>
                <td>
                    <button class="btn-gold" ${!isEligible ? 'disabled style="opacity:0.5"' : ''} 
                            onclick="window.openApplyModal('${u.universityName}', '${u._id}', ${profit})">
                        ${isEligible ? 'Apply' : 'Ineligible'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Search Error:", e); }
};

// --- 4. MODAL ACTIONS ---
window.openApplyModal = (name, id, comm) => {
    window.currentSelectedUniId = id;
    window.currentSelectedUniName = name;
    window.currentSelectedUniComm = comm;
    const modal = document.getElementById('applyModal');
    if(document.getElementById('modalTitle')) document.getElementById('modalTitle').innerText = "Applying for: " + name;
    if(modal) modal.style.display = 'block';
};

// --- 5. SUBMISSION & CLOUDINARY ---
window.uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
        const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const result = await response.json();
        return result.secure_url;
    } catch (e) { return null; }
};

window.submitApplication = async () => {
    const btn = document.getElementById('submitBtn');
    const sName = document.getElementById('sName').value;
    const sPassport = document.getElementById('sPassport').value;

    if(!sName || !sPassport) return alert("Student Name & Passport Required");

    btn.disabled = true; btn.innerText = "Uploading Files...";

    try {
        const urls = [];
        for (let i = 1; i <= 4; i++) {
            const fileInput = document.getElementById('file' + i);
            if (fileInput && fileInput.files[0]) {
                const url = await window.uploadToCloudinary(fileInput.files[0]);
                urls.push(url || "");
            } else { urls.push(""); }
        }

        const payload = {
            studentName: sName,
            passportNo: sPassport,
            university: window.currentSelectedUniName,
            universityId: window.currentSelectedUniId,
            partnerEmail: partnerEmail,
            pdf1: urls[0], pdf2: urls[1], pdf3: urls[2], pdf4: urls[3],
            commissionBDT: window.currentSelectedUniComm,
            status: "PENDING",
            timestamp: new Date().toISOString()
        };

        const res = await fetch('/api/applications', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) { alert("Submitted Successfully!"); location.reload(); }
        else { alert("Server Error during submission."); }
    } catch (e) { alert("Submission Error!"); }
    finally { btn.disabled = false; btn.innerText = "Submit File"; }
};

// --- 6. WALLET & WITHDRAW ---
window.requestWithdraw = async () => {
    // ১. ইনপুট থেকে অ্যামাউন্ট নেওয়া
    const amountInput = document.getElementById('withdrawAmount');
    const amount = Number(amountInput.value);
    
    // ২. ভ্যালিডেশন চেক
    if (!amount || amount <= 0) {
        return alert("Please enter a valid amount!");
    }

    // ৩. ব্যালেন্স চেক (নিশ্চিত করা যে currentAvailableBalance আপডেট আছে)
    if (amount > currentAvailableBalance) {
        return alert(`Insufficient Balance! Your current balance is ৳${currentAvailableBalance.toLocaleString()}`);
    }

    // ৪. কনফার্মেশন (ঐচ্ছিক কিন্তু নিরাপদ)
    if (!confirm(`Are you sure you want to withdraw ৳${amount.toLocaleString()}?`)) return;

    try {
        const res = await fetch('/api/wallet/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                partnerEmail: partnerEmail, 
                amount: amount, 
                type: 'WITHDRAW', 
                status: 'PENDING',
                timestamp: new Date().toISOString() // টাইমস্ট্যাম্প যোগ করা ভালো
            })
        });

        if (res.ok) { 
            alert("Withdrawal request sent successfully! Waiting for Admin approval."); 
            location.reload(); 
        } else {
            const errorData = await res.json();
            alert("Failed: " + (errorData.message || "Server Error"));
        }
    } catch (e) { 
        console.error("Withdraw Error:", e);
        alert("Withdrawal failed! Please check your internet connection."); 
    }
};

window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };