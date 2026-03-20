import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk", 
    authDomain: "ihp-portal-v3.firebaseapp.com", 
    projectId: "ihp-portal-v3", 
    storageBucket: "ihp-portal-v3.firebasestorage.app", 
    messagingSenderId: "481157902534", 
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('userEmail');

if (!userEmail) { window.location.href = 'index.html'; }

// --- ১. গ্লোবাল ফাংশনস ---
window.showTab = (id, el) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
    if(el) el.classList.add('active');
};
window.logout = () => { if(confirm("Are you sure?")) { localStorage.clear(); location.href='index.html'; } };
window.closeModal = () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); };

// --- ২. ওয়ালেট ও ট্র্যাকিং (Wallet Logic Fixed) ---
const syncDashboard = () => {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail.toLowerCase()));
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let allDocs = [];

        snap.forEach(dSnap => {
            const d = dSnap.data();
            allDocs.push(d);

            // ওয়ালেট লজিক ফিক্স: শুধুমাত্র স্ট্যাটাস 'verified' হলে পেন্ডিং ওয়ালেটে যাবে
            // আর 'ready' হলে ফাইনাল ওয়ালেটে যাবে
            if(d.status === 'verified') {
                if(d.commissionStatus === 'ready') final += Number(d.commission || 0);
                else pending += Number(d.commission || 0);
            }
        });

        allDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        allDocs.forEach(d => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : 'Just now';
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${d.status || 'submitted'}">${(d.status || 'submitted').toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;"><i class="fas fa-file-pdf"></i> View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        });

        document.getElementById('homeTrackingBody').innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        document.getElementById('sidebarTrackingBody').innerHTML = html || "<tr><td colspan='5' align='center'>No Data Found</td></tr>";
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
        document.getElementById('withdrawFinalBalance').innerText = final.toLocaleString();
    });
};
syncDashboard();

// --- ৩. সার্চ ও এপ্লাই বাটন ফিক্স (Apply Response Fixed) ---
let allUnis = [];
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => ({id: d.id, ...d.data()}));
});

// এই ফাংশনটি গ্লোবাল করা হয়েছে যাতে HTML থেকে এক্সেস পায়
window.openApply = (name, comm) => {
    window.selectedUni = { name, comm };
    const modal = document.getElementById('applyModal');
    const uniLabel = document.getElementById('modalUniName');
    if(modal && uniLabel) {
        uniLabel.innerText = name;
        modal.style.display = 'flex';
    } else {
        console.error("Modal elements not found!");
    }
};

document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase().trim();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLanguage').value;
    const gpaInput = parseFloat(document.getElementById('fGPA').value) || 0;
    const scoreInput = parseFloat(document.getElementById('fLangScore').value) || 0;

    const filtered = allUnis.filter(u => {
        const matchCountry = country === "" || (u.uCountry && u.uCountry.toLowerCase().includes(country));
        const matchDegree = degree === "" || u.uDegree === degree;
        const matchLang = lang === "" || u.uLanguage === lang;
        const matchGPA = gpaInput >= (parseFloat(u.minCGPA) || 0);
        const matchScore = scoreInput >= (parseFloat(u.uScore) || 0);
        return matchCountry && matchDegree && matchLang && matchGPA && matchScore;
    });

    document.getElementById('searchResultArea').style.display = 'block';
    document.getElementById('uniListContainer').innerHTML = filtered.map(u => `
        <tr>
            <td><b>${u.uName}</b><br><small>${u.uCountry}</small></td>
            <td>${u.uDegree}</td>
            <td>GPA ${u.minCGPA}+ | ${u.uLanguage} (${u.uScore})</td>
            <td>৳${(Number(u.uSemFee || 0) * 115).toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold;">৳${Number(u.partnerComm || 0).toLocaleString()}</td>
            <td><button class="btn-gold" style="padding:5px 10px;" onclick="window.openApply('${u.uName}', '${u.partnerComm}')">APPLY</button></td>
        </tr>
    `).join('') || "<tr><td colspan='6' align='center' style='padding:20px; color:#ff4757;'>No matches found.</td></tr>";
};

// --- ৪. স্লিপ জেনারেশন ---
const writeSlipContent = (win, data) => {
    win.document.write(`
        <html><head><title>Slip</title><style>body{font-family:sans-serif;padding:30px; border:2px solid #2b0054; border-radius:10px;} h2{color:#2b0054;}</style></head>
        <body>
            <h2>STUDENTS CAREER CONSULTANCY</h2><hr>
            <p><b>Student:</b> ${data.studentName}</p>
            <p><b>Passport:</b> ${data.passportNo}</p>
            <p><b>University:</b> ${data.university}</p>
            <p><b>Status:</b> Submitted Successfully</p>
            <script>window.print();<\/script>
        </body></html>`);
    win.document.close();
};

// --- ৫. ফাইল আপলোড ও সাবমিট ---
const uploadFile = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
};

document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value;

    if(!sName || !sPass) return alert("Required fields missing!");

    const slipWin = window.open('', '_blank');
    btn.innerText = "Processing..."; btn.disabled = true;

    try {
        const acadUrl = await uploadFile(document.getElementById('fileAcad').files[0]);
        const passUrl = await uploadFile(document.getElementById('filePass').files[0]);

        const appData = {
            studentName: sName,
            passportNo: sPass,
            studentPhone: document.getElementById('appSPhone').value,
            university: window.selectedUni.name,
            commission: Number(window.selectedUni.comm),
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', // এটি যখন 'verified' হবে তখন ওয়ালেটে টাকা যোগ হবে
            commissionStatus: 'pending',
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "applications"), appData);
        writeSlipContent(slipWin, appData);
        alert("Submitted Successfully!");
        closeModal();
    } catch (e) {
        if(slipWin) slipWin.close();
        alert("Upload Failed!");
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};

// প্রোফাইল লোড ও সেভ
onSnapshot(doc(db, "users", userEmail.toLowerCase()), (d) => {
    if(d.exists()) document.getElementById('welcomeName').innerText = d.data().fullName || 'Partner';
});
