import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editId = null;

// --- ১. ইউনিভার্সিটি সেভ বা আপডেট করা (Academic Score সহ) ---
document.getElementById('saveUniBtn').onclick = async () => {
    const btn = document.getElementById('saveUniBtn');
    
    // ডাটা কালেকশন (নতুন minGPA ফিল্ড সহ)
    const data = {
        name: document.getElementById('uName').value,
        country: document.getElementById('uCountry').value,
        course: document.getElementById('uCourse').value,
        degree: document.getElementById('uDegree').value,
        currency: document.getElementById('uCurrency').value,
        semesterFee: document.getElementById('uSemesterFee').value,
        scholarship: document.getElementById('uScholarship').value,
        intake: document.getElementById('uIntake').value,
        partnerCommPercent: document.getElementById('uPartnerComm').value,
        partnerBonus: document.getElementById('uPartnerBonus').value,
        appFee: document.getElementById('uAppFee').value,
        deposit: document.getElementById('uDeposit').value,
        ieltsO: document.getElementById('uIeltsO').value,
        ieltsL: document.getElementById('uIeltsL').value,
        minGPA: document.getElementById('uMinGPA') ? document.getElementById('uMinGPA').value : "0", // New Field
        interview: document.getElementById('uInterview').value,
        gap: document.getElementById('uGap').value,
        entry: document.getElementById('uEntry').value,
        adminFee: document.getElementById('uAdminFee').value,
        processTime: document.getElementById('uProcessTime').value,
        location: document.getElementById('uLocation').value,
        status: document.getElementById('uStatus').value,
        timestamp: new Date().getTime()
    };

    if(!data.name || !data.semesterFee) return alert("University Name and Fee required!");

    try {
        btn.disabled = true;
        btn.innerText = "Processing...";

        if (editId) {
            await updateDoc(doc(db, "universities", editId), data);
            alert("University Updated Successfully!");
            editId = null;
            btn.innerText = "Save University";
        } else {
            await addDoc(collection(db, "universities"), data);
            alert("University Saved Successfully!");
        }
        
        // ফর্ম ক্লিয়ার করার জন্য রিলোড
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = editId ? "Update University Info" : "Save University";
    }
};

// --- ২. রিয়েল-টাইম ডাটা টেবিল আপডেট ---
onSnapshot(query(collection(db, "universities"), orderBy("timestamp", "desc")), (snap) => {
    const tbody = document.getElementById('uniTableBody');
    let html = "";
    
    // কনভার্সন রেট
    const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };

    snap.forEach(docSnap => {
        const u = docSnap.data();
        const id = docSnap.id;

        const currentRate = rates[u.currency] || 120;
        const feeInBDT = (parseFloat(u.semesterFee) || 0) * currentRate;
        const commAmountBDT = (feeInBDT * (parseFloat(u.partnerCommPercent) || 0)) / 100;
        
        html += `
            <tr>
                <td><b>${u.name}</b><br><small style="color:#f1c40f">${u.degree}</small></td>
                <td>${u.country}</td>
                <td>${u.course}</td>
                <td>${u.currency} ${u.semesterFee} <br><small>(৳${feeInBDT.toLocaleString()})</small></td>
                <td style="color:#2ecc71; font-weight:bold;">৳ ${Math.round(commAmountBDT).toLocaleString()}</td>
                <td>
                    <button class="btn btn-edit" onclick="editUni('${id}', ${JSON.stringify(u).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-block" onclick="deleteUni('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
});

// --- ৩. এডিট ফাংশন (Form Populate) ---
window.editUni = (id, data) => {
    editId = id;
    document.getElementById('uName').value = data.name || "";
    document.getElementById('uCountry').value = data.country || "";
    document.getElementById('uCourse').value = data.course || "";
    document.getElementById('uDegree').value = data.degree || "UG";
    document.getElementById('uCurrency').value = data.currency || "USD";
    document.getElementById('uSemesterFee').value = data.semesterFee || "";
    document.getElementById('uScholarship').value = data.scholarship || "";
    document.getElementById('uIntake').value = data.intake || "";
    document.getElementById('uPartnerComm').value = data.partnerCommPercent || "";
    document.getElementById('uPartnerBonus').value = data.partnerBonus || "";
    document.getElementById('uAppFee').value = data.appFee || "";
    document.getElementById('uDeposit').value = data.deposit || "";
    document.getElementById('uIeltsO').value = data.ieltsO || "";
    document.getElementById('uIeltsL').value = data.ieltsL || "";
    
    // Academic Score ফিল্ড থাকলে ভ্যালু বসাবে
    if(document.getElementById('uMinGPA')) {
        document.getElementById('uMinGPA').value = data.minGPA || "";
    }

    document.getElementById('uInterview').value = data.interview || "No";
    document.getElementById('uGap').value = data.gap || "";
    document.getElementById('uEntry').value = data.entry || "";
    document.getElementById('uAdminFee').value = data.adminFee || "";
    document.getElementById('uProcessTime').value = data.processTime || "";
    document.getElementById('uLocation').value = data.location || "";
    document.getElementById('uStatus').value = data.status || "Active";

    document.getElementById('saveUniBtn').innerText = "Update University Info";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- ৪. ডিলিট ফাংশন ---
window.deleteUni = async (id) => {
    if(confirm("Are you sure you want to delete this university?")) {
        try {
            await deleteDoc(doc(db, "universities", id));
        } catch (e) {
            alert("Delete failed: " + e.message);
        }
    }
};

// --- ৫. লগআউট ---
document.getElementById('logoutAdmin').onclick = () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        alert("Logout Error: " + error.message);
    });
};