let currentActiveId = null;
let currentCommission = 0;
const staffEmail = localStorage.getItem('userEmail') || "compliance@scc.com";

// ১. স্টাফের নাম ডিসপ্লে সেট করা
document.getElementById('staffNameDisplay').innerText = staffEmail.split('@')[0].toUpperCase();

// ২. অ্যাপ্লিকেশন লিস্ট লোড করা
async function loadApplications() {
    try {
        const res = await fetch('/api/applications'); 
        const apps = await res.json();
        
        let queueHtml = "";
        let historyHtml = "";

        apps.forEach(d => {
            // লজিক: শুধু 'UNDER_REVIEW' বা 'PENDING' কিউতে থাকবে
            const isFinished = !["UNDER_REVIEW", "PENDING"].includes(d.status);
            
            // লকিং লজিক
            const isLockedByOther = d.lockBy && d.lockBy !== staffEmail && new Date(d.lockUntil) > new Date();
            const lockStyle = isLockedByOther ? "opacity: 0.6; cursor: not-allowed;" : "";
            const btnText = isLockedByOther ? `<i class="fas fa-lock"></i> LOCKED` : `<i class="fas fa-edit"></i> REVIEW`;

            // আপনার জাভাস্ক্রিপ্ট লজিকের এই অংশটুকু আপডেট করুন
const row = `
    <tr>
        <td><b>${d.studentName}</b></td>
        <td>${d.passportNo || 'N/A'}</td>
        <td>${d.university}</td>
        <td><span class="status-pill status-${d.status.toLowerCase()}">${d.status.replace(/_/g, ' ')}</span></td>
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

        document.getElementById('complianceTableBody').innerHTML = queueHtml || "<tr><td colspan='6' style='text-align:center; padding:20px;'>No pending files.</td></tr>";
        document.getElementById('historyTableBody').innerHTML = historyHtml || "<tr><td colspan='6' style='text-align:center; padding:20px;'>No processed history.</td></tr>";
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

// ৩. লকিং এবং ৪টি PDF শো করাসহ মোডাল ওপেন
// compliance-logic.js এর এই অংশটুকু আপডেট করুন
window.openReviewModal = async (id, name, commission, passport, university) => {
    // ... আগের লকিং লজিক ঠিক থাকবে ...
    
    const res = await fetch(`/api/applications/${id}`);
    const d = await res.json();
    
    // ৪টি ফাইল চেক করে ডাইনামিক লিঙ্ক তৈরি
    let docHtml = "";
    if (d.pdf1) docHtml += `<a href="${d.pdf1}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> 1. Passport Copy</a>`;
    if (d.pdf2) docHtml += `<a href="${d.pdf2}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> 2. Academic Records</a>`;
    if (d.pdf3) docHtml += `<a href="${d.pdf3}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> 3. English Proficiency</a>`;
    if (d.pdf4) docHtml += `<a href="${d.pdf4}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> 4. Other/CV Docs</a>`;

    document.getElementById('docLinksArea').innerHTML = docHtml || "<p style='color:orange;'>No documents found.</p>";
    
};

        if(d.status) {
            document.getElementById('statusSelect').value = d.status;
            updateWalletIndicator(d.status); // লোড হওয়ার সময় ইন্ডিকেটর আপডেট
        }
        document.getElementById('complianceNote').value = d.complianceNote || "";

        document.getElementById('reviewModal').style.display = 'flex';
    } catch (e) {
        alert("Error loading details or acquiring lock.");
    }
};

// ৪. স্ট্যাটাস আপডেট ও অটো-আনলক
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('complianceNote').value;
    const btn = document.getElementById('applyStatusBtn');

    if(!note) return alert("Please add a note before authorizing!");

    const payload = {
        appId: currentActiveId,
        status: selectedStatus,
        complianceNote: note,
        staffEmail: staffEmail,
        commission: currentCommission 
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
            alert("✅ Updated & Synchronized!");
            currentActiveId = null; // সাকসেস হলে আইডি ক্লিয়ার
            closeModal();
            loadApplications(); 
        } else {
            alert("❌ Update Failed!");
        }
    } catch (e) {
        alert("Network Error.");
    } finally {
        btn.disabled = false;
        btn.innerText = "SYNC & AUTHORIZE";
    }
};

// ৫. ওয়ালেট সিঙ্ক ইন্ডিকেটর লজিক
document.getElementById('statusSelect').addEventListener('change', (e) => {
    updateWalletIndicator(e.target.value);
});

function updateWalletIndicator(status) {
    const indicator = document.getElementById('walletSyncIndicator');
    if (status === 'PAID' || status === 'VISA_GRANTED' || status === 'ENROLLED') {
        indicator.innerHTML = `<i class="fas fa-check-circle"></i> Wallet Release Ready`;
        indicator.style.color = "#2ecc71";
    } else {
        indicator.innerHTML = `<i class="fas fa-sync"></i> Internal Sync Only`;
        indicator.style.color = "#888";
    }
}

// ৬. জেনারেল ফাংশন (অটো-আনলকসহ)
window.closeModal = async () => {
    if (currentActiveId) {
        // কাজ শেষ না করে ক্লোজ করলে সার্ভারে আনলক কল যাবে
        await fetch(`/api/unlock-application/${currentActiveId}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffEmail: staffEmail })
        });
        currentActiveId = null;
    }
    document.getElementById('reviewModal').style.display = 'none';
};

window.switchTab = (tabId, el) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId + 'Section').style.display = 'block';
    if(el) el.classList.add('active');
};

// ইনিশিয়াল লোড
loadApplications();
