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

let editId = null; // Edit mode track korar jonno

// --- ১. ইউনিভার্সিটি সেভ ba আপডেট করা ---
document.getElementById('saveUniBtn').onclick = async () => {
    const btn = document.getElementById('saveUniBtn');
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
        if (editId) {
            // Edit Mode: Update existing doc
            await updateDoc(doc(db, "universities", editId), data);
            alert("University Updated Successfully!");
            editId = null;
            btn.innerText = "Save University";
        } else {
            // New Mode: Add new doc
            await addDoc(collection(db, "universities"), data);
            alert("University Saved Successfully!");
        }
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
    }
};

// --- ২. রিয়েল-টাইম ডাটা টেবিল আপডেট (Fixed Calculation) ---
onSnapshot(query(collection(db, "universities"), orderBy("timestamp", "desc")), (snap) => {
    const tbody = document.getElementById('uniTableBody');
    let html = "";
    
    const rates = { 'GBP': 155, 'USD': 120, 'EUR': 132, 'BDT': 1 };

    snap.forEach(docSnap => {
        const u = docSnap.data();
        const id = docSnap.id;

        const currentRate = rates[u.currency] || 120;
        const feeInBDT = (parseFloat(u.semesterFee) || 0) * currentRate; // Age Conversion
        const commAmountBDT = (feeInBDT * (parseFloat(u.partnerCommPercent) || 0)) / 100; // Tarpor % calculation
        
        html += `
            <tr>
                <td><b>${u.name}</b></td>
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

// --- ৩. Edit Function (Form fufill kora) ---
window.editUni = (id, data) => {
    editId = id;
    document.getElementById('uName').value = data.name;
    document.getElementById('uCountry').value = data.country;
    document.getElementById('uCourse').value = data.course;
    document.getElementById('uDegree').value = data.degree;
    document.getElementById('uCurrency').value = data.currency;
    document.getElementById('uSemesterFee').value = data.semesterFee;
    document.getElementById('uScholarship').value = data.scholarship;
    document.getElementById('uIntake').value = data.intake;
    document.getElementById('uPartnerComm').value = data.partnerCommPercent;
    document.getElementById('uPartnerBonus').value = data.partnerBonus;
    document.getElementById('uAppFee').value = data.appFee;
    document.getElementById('uDeposit').value = data.deposit;
    document.getElementById('uIeltsO').value = data.ieltsO;
    document.getElementById('uIeltsL').value = data.ieltsL;
    document.getElementById('uInterview').value = data.interview;
    document.getElementById('uGap').value = data.gap;
    document.getElementById('uEntry').value = data.entry;
    document.getElementById('uAdminFee').value = data.adminFee;
    document.getElementById('uProcessTime').value = data.processTime;
    document.getElementById('uLocation').value = data.location;
    document.getElementById('uStatus').value = data.status;

    document.getElementById('saveUniBtn').innerText = "Update University Info";
    window.scrollTo(0, 0); // Form-er kache niye jaoa
};

// --- ৪. ডিলিট ফাংশন ---
window.deleteUni = async (id) => {
    if(confirm("Are you sure?")) {
        await deleteDoc(doc(db, "universities", id));
    }
};

// --- ৫. লগআউট ---
document.getElementById('logoutAdmin').onclick = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};