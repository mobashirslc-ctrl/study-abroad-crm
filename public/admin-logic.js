import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// --- ১. ইউনিভার্সিটি ডাটা সেভ করা ---
document.getElementById('saveUniBtn').onclick = async () => {
    const data = {
        universityName: document.getElementById('uName').value,
        country: document.getElementById('uCountry').value,
        courseName: document.getElementById('uCourse').value,
        degreeType: document.getElementById('uDegree').value,
        semesterFee: document.getElementById('uSemesterFee').value,
        partnerComm: document.getElementById('uPartnerComm').value,
        minGPA: document.getElementById('uMinGPA').value,
        ieltsO: document.getElementById('uIeltsO').value,
        gap: document.getElementById('uGap').value,
        intake: document.getElementById('uIntake').value,
        scholarship: document.getElementById('uScholarship').value,
        status: document.getElementById('uStatus').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "universities"), data);
        alert("University Added!");
        location.reload();
    } catch (e) { alert(e.message); }
};

// --- ২. ইউনিভার্সিটি লিস্ট লোড করা ---
onSnapshot(query(collection(db, "universities"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('uniTableBody');
    let html = "";
    snap.forEach(docSnap => {
        const u = docSnap.data();
        html += `<tr>
            <td>${u.universityName}</td>
            <td>${u.country}</td>
            <td>${u.courseName}</td>
            <td>${u.minGPA}</td>
            <td><button class="btn" style="background:#ff4757" onclick="deleteUni('${docSnap.id}')">Delete</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
});

window.deleteUni = async (id) => {
    if(confirm("Delete this university?")) await deleteDoc(doc(db, "universities", id));
};

// --- ৩. পার্টনার ম্যানেজমেন্ট (Real-time) ---
onSnapshot(collection(db, "partners"), async (snap) => {
    const tbody = document.getElementById('partnerTableBody');
    let html = "";

    for (const docSnap of snap.docs) {
        const p = docSnap.data();
        const partnerId = docSnap.id;

        // ফাইল কাউন্ট করা (Applications থেকে ওই পার্টনারের ইমেইল দিয়ে ফিল্টার)
        const q = query(collection(db, "applications"), where("partnerEmail", "==", p.email || ""));
        const appSnap = await getDocs(q);
        const fileCount = appSnap.size;

        html += `<tr>
            <td>${p.fullName || 'N/A'}</td>
            <td>${p.orgName || 'N/A'}</td>
            <td>${p.phone || 'N/A'}</td>
            <td>
                <button onclick="togglePartnerStatus('${partnerId}', '${p.status}')" class="status-toggle" 
                    style="background:${p.status === 'active' ? '#2ecc71' : '#ff4757'}">
                    ${(p.status || 'inactive').toUpperCase()}
                </button>
            </td>
            <td>${p.expiryDate || 'N/A'}</td>
            <td><span class="badge">${fileCount}</span></td>
            <td>
                ${p.accountStatus === 'pending' ? 
                    `<button class="btn" style="background:#2ecc71" onclick="approvePartner('${partnerId}')">Approve</button>` : 
                    `<span style="color:#2ecc71"><i class="fas fa-check"></i> Verified</span>`
                }
            </td>
        </tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;">No partners found.</td></tr>';
});

// --- ৪. পার্টনার অ্যাকশন ফাংশনস ---
window.togglePartnerStatus = async (id, current) => {
    const next = current === 'active' ? 'inactive' : 'active';
    await updateDoc(doc(db, "partners", id), { status: next });
};

window.approvePartner = async (id) => {
    if(confirm("Approve this partner?")) {
        await updateDoc(doc(db, "partners", id), { 
            accountStatus: 'approved', 
            status: 'active' 
        });
    }
};

// --- ৫. লগআউট ---
document.getElementById('logoutAdmin').onclick = () => signOut(auth).then(() => location.href = "login.html");