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
const saveBtn = document.getElementById('saveUniBtn');
if(saveBtn) {
    saveBtn.onclick = async () => {
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
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "universities"), data);
            alert("University Added!");
            location.reload();
        } catch (e) { alert(e.message); }
    };
}

// --- ২. ইউনিভার্সিটি লিস্ট লোড করা ---
onSnapshot(query(collection(db, "universities"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('uniTableBody');
    if(!tbody) return;
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

// --- ৩. পার্টনার ও স্টাফ ম্যানেজমেন্ট (users কালেকশন থেকে) ---
// এখানে 'partners' এর বদলে 'users' ব্যবহার করা হয়েছে যাতে রেজিস্ট্রেশন করা ইউজারদের দেখা যায়
onSnapshot(collection(db, "users"), async (snap) => {
    const tbody = document.getElementById('partnerTableBody');
    if(!tbody) return;
    let html = "";

    for (const docSnap of snap.docs) {
        const p = docSnap.data();
        const userId = docSnap.id;

        // ফাইল কাউন্ট করা (যদি সে পার্টনার হয়)
        let fileCount = 0;
        if(p.role === 'partner') {
            const q = query(collection(db, "applications"), where("partnerEmail", "==", p.email));
            const appSnap = await getDocs(q);
            fileCount = appSnap.size;
        }

        html += `<tr>
            <td>${p.fullName || 'N/A'}</td>
            <td>${p.role ? p.role.toUpperCase() : 'N/A'}</td>
            <td>${p.email || 'N/A'}</td>
            <td>
                <span class="badge" style="background:${p.status === 'active' ? '#2ecc71' : '#f39c12'}">
                    ${(p.status || 'pending').toUpperCase()}
                </span>
            </td>
            <td><span class="badge" style="background:#3498db">${fileCount} Files</span></td>
            <td>
                ${p.status === 'pending' ? 
                    `<button class="btn" style="background:#2ecc71" onclick="approveUser('${userId}')">Approve</button>` : 
                    `<button class="btn" style="background:#ff4757" onclick="suspendUser('${userId}')">Suspend</button>`
                }
            </td>
        </tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>';
});

// --- ৪. ইউজার অ্যাকশন ফাংশনস ---
window.approveUser = async (id) => {
    if(confirm("Approve this user?")) {
        await updateDoc(doc(db, "users", id), { status: 'active' });
    }
};

window.suspendUser = async (id) => {
    if(confirm("Suspend this user?")) {
        await updateDoc(doc(db, "users", id), { status: 'pending' });
    }
};

// --- ৫. লগআউট ---
const logoutBtn = document.getElementById('logoutAdmin');
if(logoutBtn) {
    logoutBtn.onclick = () => {
        signOut(auth).then(() => location.href = "index.html");
    };
}