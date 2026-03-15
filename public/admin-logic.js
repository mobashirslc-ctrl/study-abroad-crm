import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// ১. ইউনিভার্সিটি সেভ করা
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
        btn.innerText = "Saving...";
        btn.disabled = true;
        await addDoc(collection(db, "universities"), data);
        alert("University Data Saved Successfully!");
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Save University";
    }
};

// ২. রিয়েল-টাইম ডাটা টেবিল আপডেট (Currency to BDT Conversion Logic সহ)
onSnapshot(query(collection(db, "universities"), orderBy("timestamp", "desc")), (snap) => {
    const tbody = document.getElementById('uniTableBody');
    let html = "";
    
    // কারেন্সি কনভারশন রেট (প্রয়োজনে এখান থেকে পরিবর্তন করতে পারবেন)
    const rates = {
        'GBP': 155, 
        'USD': 120, 
        'EUR': 132,
        'BDT': 1
    };

    snap.forEach(docSnap => {
        const u = docSnap.data();
        const id = docSnap.id;

        // ক্যালকুলেশন পার্ট:
        const currentRate = rates[u.currency] || 120; // কারেন্সি না মিললে ডিফল্ট ১২০ ধরবে
        const semesterFeeNum = parseFloat(u.semesterFee) || 0;
        const commPercentNum = parseFloat(u.partnerCommPercent) || 0;

        // ১. আগে ফি-কে টাকায় কনভার্ট করা
        const feeInBDT = semesterFeeNum * currentRate;

        // ২. কনভার্টেড টাকার ওপর পার্সেন্টেজ হিসাব করা
        const commAmountBDT = (feeInBDT * commPercentNum) / 100;
        
        html += `
            <tr>
                <td><b>${u.name}</b></td>
                <td>${u.country}</td>
                <td>${u.course} (${u.degree})</td>
                <td>
                    ${u.currency} ${semesterFeeNum.toLocaleString()} 
                    <br><small style="color:#aaa;">(৳ ${feeInBDT.toLocaleString()})</small>
                </td>
                <td style="color:#2ecc71; font-weight:bold;">
                    ৳ ${Math.round(commAmountBDT).toLocaleString()}
                </td>
                <td>
                    <button class="btn btn-edit" onclick="alert('Edit logic can be added here')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-block" onclick="deleteUni('${id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
});

// ৩. ডিলিট ফাংশন
window.deleteUni = async (id) => {
    if(confirm("Are you sure you want to delete this university?")) {
        try {
            await deleteDoc(doc(db, "universities", id));
            alert("Deleted Successfully!");
        } catch (err) {
            alert("Delete failed: " + err.message);
        }
    }
};

// ৪. লগআউট
document.getElementById('logoutAdmin').onclick = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};