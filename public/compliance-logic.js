let currentActiveId = null;
let currentCommission = 0;
const staffEmail = localStorage.getItem('userEmail') || "compliance@scc.com";

document.getElementById('staffNameDisplay').innerText = staffEmail.split('@')[0].toUpperCase();

async function loadApplications() {
    try {
        const res = await fetch('/api/applications'); 
        const apps = await res.json();
        
        let queueHtml = "";
        let historyHtml = "";

        apps.forEach(d => {
            // লজিক: শুধু 'UNDER_REVIEW' বা 'PENDING' থাকলে ইনকামিং কিউতে দেখাবে
            const isFinished = !["UNDER_REVIEW", "PENDING"].includes(d.status);
            
            // লকিং ইন্ডিকেটর: যদি অন্য কেউ লক করে রাখে
            const isLockedByOther = d.lockBy && d.lockBy !== staffEmail && new Date(d.lockUntil) > new Date();
            const lockStyle = isLockedByOther ? "opacity: 0.6; cursor: not-allowed;" : "";
            const btnText = isLockedByOther ? `<i class="fas fa-lock"></i> LOCKED` : `<i class="fas fa-edit"></i> REVIEW`;

            const row = `
                <tr>
                    <td><b>${d.studentName}</b></td>
                    <td>${d.passportNo || 'N/A'}</td>
                    <td>${d.university}</td>
                    <td><span class="status-pill status-${d.status.toLowerCase()}">${d.status.replace(/_/g, ' ')}</span></td>
                    <td>${d.complianceMember || 'Pending'}</td>
                    <td>
                        <button class="btn-action" 
                                style="${lockStyle}" 
                                onclick="openReviewModal('${d._id}', '${d.studentName}', ${d.commissionBDT || 0}, '${d.passportNo || ''}')"
                                ${isLockedByOther ? 'disabled' : ''}>
                            ${btnText}
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

// ৪. হার্ড লকিং নিশ্চিত করে মোডাল ওপেন
window.openReviewModal = async (id, name, commission, passport) => {
    try {
        // ১. হার্ড লকিং রিকোয়েস্ট পাঠানো
        const lockRes = await fetch(`/api/lock-application/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffEmail: staffEmail })
        });
        
        const lockData = await lockRes.json();

        if (lockRes.status === 403) {
            alert(`⚠️ এই ফাইলটি বর্তমানে ${lockData.message}। অনুগ্রহ করে ৫ মিনিট পর চেষ্টা করুন।`);
            return;
        }

        // ২. লক সফল হলে ডাটা ফেচ করা
        currentActiveId = id;
        currentCommission = commission;
        
        document.getElementById('revStudentName').innerText = "Reviewing: " + name;
        document.getElementById('targetComm').innerText = `Passport: ${passport} | Commission: ৳${commission.toLocaleString()}`;
        
        const res = await fetch(`/api/applications/${id}`);
        const d = await res.json();
        
        let docHtml = "";
        if (d.pdf1) docHtml += `<a href="${d.pdf1}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> View Passport</a>`;
        if (d.pdf2) docHtml += `<a href="${d.pdf2}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> Academic Records</a>`;
        if (d.pdf3) docHtml += `<a href="${d.pdf3}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> Other Docs</a>`;

        document.getElementById('docLinksArea').innerHTML = docHtml || "<p style='color:orange;'>No documents found.</p>";
        
        if(d.status) document.getElementById('statusSelect').value = d.status;
        document.getElementById('complianceNote').value = d.complianceNote || "";

        document.getElementById('reviewModal').style.display = 'flex';
    } catch (e) {
        alert("Error acquiring lock or loading details.");
    }
};

// ৫. স্ট্যাটাস আপডেট ও অটো-আনলক
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('complianceNote').value;
    const btn = document.getElementById('applyStatusBtn');

    const payload = {
        appId: currentActiveId,
        status: selectedStatus,
        complianceNote: note || "Reviewed by compliance",
        staffEmail: staffEmail,
        commission: currentCommission 
    };

    try {
        btn.disabled = true;
        btn.innerText = "Syncing...";

        const res = await fetch('/api/update-compliance', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Updated & Unlocked!");
            closeModal();
            loadApplications(); 
        } else {
            alert("❌ Update Failed!");
        }
    } catch (e) {
        alert("Network Error.");
    } finally {
        btn.disabled = false;
        btn.innerText = "SYNC & UPDATE";
    }
};

window.closeModal = () => {
    document.getElementById('reviewModal').style.display = 'none';
};

window.switchTab = (tabId, el) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId + 'Section').style.display = 'block';
    el.classList.add('active');
};

loadApplications();
