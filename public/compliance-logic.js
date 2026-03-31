let currentActiveId = null;
let currentCommission = 0;
const staffEmail = localStorage.getItem('userEmail') || "compliance@scc.com";

// ১. স্টাফের নাম ডিসপ্লে (Clipped for UI)
const staffDisplayName = document.getElementById('staffNameDisplay');
if(staffDisplayName) staffDisplayName.innerText = staffEmail.split('@')[0].toUpperCase();

// ২. অ্যাপ্লিকেশন লিস্ট লোড করা (With Auto-Refresh & Improved UI Mapping)
async function loadApplications() {
    try {
        const res = await fetch('/api/applications'); 
        if (!res.ok) throw new Error("Failed to fetch applications");
        const apps = await res.json();
        
        let queueHtml = "";
        let historyHtml = "";

        apps.forEach(d => {
            // লজিক: শুধু 'UNDER_REVIEW' বা 'PENDING' কিউতে থাকবে
            const isFinished = !["UNDER_REVIEW", "PENDING"].includes(d.status);
            
            // স্ট্যাটাস অনুযায়ী ডাইনামিক ক্লাস জেনারেট
            const statusClass = `status-${d.status.toLowerCase()}`;
            
            const row = `
                <tr>
                    <td><b>${d.studentName}</b></td>
                    <td>${d.passportNo || 'N/A'}</td>
                    <td>${d.university}</td>
                    <td><span class="status-pill ${statusClass}">${d.status.replace(/_/g, ' ')}</span></td>
                    <td>
                        <button class="btn-action" 
                                onclick="openReviewModal('${d._id}', '${d.studentName}', ${d.commissionBDT || 0}, '${d.passportNo || ''}', '${d.university}')">
                            <i class="fas fa-eye"></i> REVIEW
                        </button>
                    </td>
                </tr>`;

            if (isFinished) historyHtml += row;
            else queueHtml += row;
        });

        document.getElementById('complianceTableBody').innerHTML = queueHtml || "<tr><td colspan='5' style='text-align:center; padding:20px; color:#666;'>No pending files.</td></tr>";
        document.getElementById('historyTableBody').innerHTML = historyHtml || "<tr><td colspan='5' style='text-align:center; padding:20px; color:#666;'>No processed history.</td></tr>";
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

// প্রতি ৬০ সেকেন্ডে অটো-রিফ্রেশ
setInterval(loadApplications, 60000);

// ৩. মোডাল ওপেন ও ৪টি PDF শো করা (With Commission & Locking Safety)
window.openReviewModal = async (id, name, commission, passport, university) => {
    try {
        // ১. লকিং লজিক (আগের মতোই থাকবে)
        const lockRes = await fetch(`/api/lock-application/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffEmail: staffEmail })
        });
        
        if (lockRes.status === 403) {
            const lockData = await lockRes.json();
            alert(`⚠️ এই ফাইলটি বর্তমানে ${lockData.lockedBy || 'অন্য একজন'} রিভিউ করছেন।`);
            return;
        }

        // ২. ডাটা ফেচিং (এটাই আপনার নতুন লজিক)
        const res = await fetch('/api/applications'); // সব ডাটা আনছি
        const allApps = await res.json();
        const d = allApps.find(app => app._id === id); // মেমোরি থেকে আইডি খুঁজে বের করছি

        if(!d) {
            alert("ফাইলটি ডাটাবেসে খুঁজে পাওয়া যাচ্ছে না!");
            return;
        }

        // ৩. ডাটা মোডালে বসানো
        currentActiveId = id;
        currentCommission = Number(commission) || 0;
        document.getElementById('revStudentName').innerText = "Reviewing: " + (d.studentName || name);
        document.getElementById('targetUniDisplay').innerText = `Applying for: ${d.university || university}`;

        // ৪. ফাইল লিঙ্ক দেখানো
        let docHtml = "";
        if (d.pdf1) docHtml += `<a href="${d.pdf1}" target="_blank" class="doc-link">Passport</a>`;
        if (d.pdf2) docHtml += `<a href="${d.pdf2}" target="_blank" class="doc-link">Academic</a>`;
        if (d.pdf3) docHtml += `<a href="${d.pdf3}" target="_blank" class="doc-link">English</a>`;
        if (d.pdf4) docHtml += `<a href="${d.pdf4}" target="_blank" class="doc-link">Other</a>`;

        document.getElementById('docLinksArea').innerHTML = docHtml || "No documents found.";
        document.getElementById('reviewModal').style.display = 'flex';

    } catch (e) {
        console.error("Review Load Error:", e);
        alert("Error loading details. Please check console for logs.");
    }
};

// ৪. স্ট্যাটাস অনুযায়ী ওয়ালেট ইন্ডিকেটর
function updateWalletIndicator(status) {
    const indicator = document.getElementById('walletSyncIndicator');
    if (status === 'DOCS_VERIFIED') {
        indicator.innerHTML = `<i class="fas fa-check-circle"></i> Wallet: PENDING SYNC`;
        indicator.style.color = "#2ecc71";
        indicator.style.background = "rgba(46, 204, 113, 0.1)";
    } else if (status === 'MISSING_DOCS') {
        indicator.innerHTML = `<i class="fas fa-times-circle"></i> No Wallet Sync`;
        indicator.style.color = "#ff4757";
        indicator.style.background = "rgba(255, 71, 87, 0.1)";
    } else {
        indicator.innerHTML = `<i class="fas fa-sync"></i> Internal Tracking Only`;
        indicator.style.color = "#888";
        indicator.style.background = "rgba(255,255,255,0.05)";
    }
}

document.getElementById('statusSelect').addEventListener('change', (e) => {
    updateWalletIndicator(e.target.value);
});

// ৫. ডাটা সেভ করা (With Confirmation & Targeted Wallet Sync)
// ৫. ডাটা সেভ করা (With Confirmation & Targeted Wallet Sync)
// ৫. ডাটা সেভ করা (With Confirmation & Targeted Wallet Sync)
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('complianceNote').value;
    const btn = document.getElementById('applyStatusBtn');

    if(!note) return alert("Please add a note before authorizing!");

    // --- ওয়ালেট সিঙ্ক লজিক ---
    let amountToSync = 0; 

    if(selectedStatus === 'DOCS_VERIFIED') {
        if(!confirm("Are you sure? This will verify documents and sync BDT " + currentCommission + " to wallet (Pending).")) return;
        amountToSync = currentCommission; 
    }

    // --- সঠিক PAYLOAD (Compliance এর জন্য) ---
    const payload = {
        appId: currentActiveId,         // কোন স্টুডেন্ট
        status: selectedStatus,         // নতুন স্ট্যাটাস (যেমন: DOCS_VERIFIED)
        complianceNote: note,           // স্টাফের নোট
        staffEmail: staffEmail,         // কোন স্টাফ আপডেট করছে
        commission: amountToSync        // ওয়ালেটে কত টাকা যাবে (০ অথবা কমিশন)
    };

    try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> SYNCING...`;

        const res = await fetch('/api/update-compliance', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Updated Successfully!");
            currentActiveId = null; 
            closeModal(); 
            loadApplications(); 
        } else {
            const errorData = await res.json();
            alert("Error: " + errorData.error);
        }
    } catch (e) { 
        alert("Network Error. Check your server connection.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-shield-alt"></i> SYNC & AUTHORIZE`;
    }
};




// অতিরিক্ত: অটো-আনলক এবং ট্যাব সুইচ
window.closeModal = async () => {
    if (currentActiveId) {
        await fetch(`/api/unlock-application/${currentActiveId}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffEmail: staffEmail })
        });
        currentActiveId = null;
    }
    document.getElementById('reviewModal').style.display = 'none';
};

window.addEventListener('beforeunload', () => {
    if (currentActiveId) {
        navigator.sendBeacon(`/api/unlock-application/${currentActiveId}`, JSON.stringify({ staffEmail }));
    }
});

// পার্ট ২: ডাইনামিক ট্যাব সুইচিং
window.switchTab = (tab, el) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetSection = document.getElementById(tab + 'Section');
    if(targetSection) targetSection.style.display = 'block';
    
    // যদি সরাসরি ক্লিক করা হয় তবে 'el' থাকবে, না থাকলে ID দিয়ে খুঁজে নিবে
    if(el) {
        el.classList.add('active');
    } else {
        const navEl = document.getElementById('nav-' + tab);
        if(navEl) navEl.classList.add('active');
    }
};

loadApplications();
