let currentActiveId = null;
let currentCommission = 0;
// ইউজারের ইমেইল লোকাল স্টোরেজ থেকে নিচ্ছি (লগইনের সময় সেট করা থাকতে হবে)
const staffEmail = localStorage.getItem('userEmail') || "compliance@scc.com";

// ১. স্টাফের নাম ডিসপ্লে
document.getElementById('staffNameDisplay').innerText = staffEmail.split('@')[0].toUpperCase();

// ২. ডাটা লোড করা (Real-time feel এর জন্য ১ মিনিট পর পর অটো রিফ্রেশ দিতে পারেন)
async function loadApplications() {
    try {
        const res = await fetch('/api/applications'); 
        const apps = await res.json();
        
        let queueHtml = "";
        let historyHtml = "";

        apps.forEach(d => {
            // লজিক: শুধু 'UNDER_REVIEW' থাকলে ইনকামিং কিউতে দেখাবে, বাকি সব হিস্ট্রিতে
            const isFinished = d.status !== "UNDER_REVIEW";
            
            const row = `
                <tr>
                    <td><b>${d.studentName}</b></td>
                    <td>${d.passportNo || 'N/A'}</td>
                    <td>${d.university}</td>
                    <td><span class="status-pill">${d.status.replace(/_/g, ' ')}</span></td>
                    <td>${d.complianceMember || 'Pending'}</td>
                    <td>
                        <button class="btn-action" onclick="openReviewModal('${d._id}', '${d.studentName}', ${d.commissionBDT || 0}, '${d.passportNo || ''}')">
                            <i class="fas fa-edit"></i> REVIEW
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

// ৩. রিভিউ মোডাল ওপেন
window.openReviewModal = async (id, name, commission, passport) => {
    currentActiveId = id;
    currentCommission = commission;
    
    document.getElementById('revStudentName').innerText = "Reviewing: " + name;
    document.getElementById('targetComm').innerText = `Passport: ${passport} | Commission: ৳${commission.toLocaleString()}`;
    
    try {
        const res = await fetch(`/api/applications/${id}`);
        const d = await res.json();
        
        let docHtml = "";
        // আপনার MongoDB কালেকশনের ফিল্ড নেম অনুযায়ী PDF চেক
        if (d.pdf1) docHtml += `<a href="${d.pdf1}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> View Passport Copy</a>`;
        if (d.pdf2) docHtml += `<a href="${d.pdf2}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> View Academic Records</a>`;
        if (d.pdf3) docHtml += `<a href="${d.pdf3}" target="_blank" class="doc-link"><i class="fas fa-file-pdf"></i> View Other Documents</a>`;

        document.getElementById('docLinksArea').innerHTML = docHtml || "<p style='color:orange; font-size:12px;'>No PDF documents found.</p>";
        
        // ড্রপডাউনে বর্তমান স্ট্যাটাস সেট করা (HTML এর ভ্যালুর সাথে ম্যাচ করে)
        if(d.status) document.getElementById('statusSelect').value = d.status;
        document.getElementById('complianceNote').value = d.complianceNote || "";

        document.getElementById('reviewModal').style.display = 'flex';
    } catch (e) {
        alert("Could not load details. Make sure API is running.");
    }
};

// ৪. স্ট্যাটাস আপডেট ও ওয়ালেট সিঙ্ক (PATCH Request)
document.getElementById('applyStatusBtn').onclick = async () => {
    if (!currentActiveId) return;
    
    const selectedStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('complianceNote').value;
    const btn = document.getElementById('applyStatusBtn');

    const payload = {
        appId: currentActiveId,
        status: selectedStatus, // e.g., "VERIFIED", "GS_READY", "APPLIED_VISA"
        complianceNote: note || "No notes",
        complianceMember: staffEmail.split('@')[0],
        commission: currentCommission 
    };

    try {
        btn.disabled = true;
        btn.innerText = "Syncing Data...";

        const res = await fetch('/api/update-compliance', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("✅ Success: Update Saved!");
            closeModal();
            loadApplications(); // ডাটা রিফ্রেশ
        } else {
            const err = await res.json();
            alert("❌ Update Failed: " + err.message);
        }
    } catch (e) {
        alert("Network Error: Backend not reachable.");
    } finally {
        btn.disabled = false;
        btn.innerText = "SYNC & UPDATE";
    }
};

// ৫. অন্যান্য ইউটিলিটি ফাংশন
window.closeModal = () => {
    document.getElementById('reviewModal').style.display = 'none';
};

window.switchTab = (tabId, el) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId + 'Section').style.display = 'block';
    el.classList.add('active');
};

// লগআউট লজিক
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.replace("index.html");
};

// পেজ লোড হলে ডাটা আনা
loadApplications();
