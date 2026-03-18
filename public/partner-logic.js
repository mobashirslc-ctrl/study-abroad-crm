import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// আপনার Firebase Config এখানে দিন
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

// --- ১. স্মার্ট অ্যাসেসমেন্ট ফিল্টার (অ্যাডমিন ডাটা অনুযায়ী) ---
function initSmartSearch() {
    const uniRef = collection(db, "universities");

    onSnapshot(uniRef, (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const runFilter = () => {
            const countrySearch = document.getElementById('fCountry').value.toLowerCase();
            const degreeSearch = document.getElementById('fDegree').value;
            const studentLangScore = parseFloat(document.getElementById('fScore').value) || 0;
            const studentGPA = parseFloat(document.getElementById('fGPA').value) || 0;

            const filtered = allUnis.filter(u => {
                const matchCountry = u.country.toLowerCase().includes(countrySearch);
                const matchDegree = degreeSearch === "" || u.degree === degreeSearch;
                
                // লজিক: স্টুডেন্টের স্কোর অ্যাডমিনের দেওয়া রিকোয়ারমেন্টের সমান বা বেশি হতে হবে
                const matchLang = studentLangScore >= (parseFloat(u.ieltsReq) || 0);
                const matchGPA = studentGPA >= (parseFloat(u.minGPA) || 0);

                return matchCountry && matchDegree && matchLang && matchGPA;
            });

            renderResults(filtered);
        };

        // ইনপুট বক্সে টাইপ করার সাথে সাথে ফিল্টার হবে
        ['fCountry', 'fDegree', 'fScore', 'fGPA'].forEach(id => {
            document.getElementById(id).addEventListener('input', runFilter);
        });

        runFilter(); // প্রথমবার লোড হওয়ার জন্য
    });
}

function renderResults(data) {
    const tbody = document.getElementById('uniResults');
    tbody.innerHTML = data.map(u => {
        // কমিশন ক্যালকুলেশন (৳ ১২০ রেট)
        const comm = ((u.semesterFee * u.partnerComm) / 100) * 120;
        
        return `<tr>
            <td><b>${u.universityName}</b><br><small>${u.courseName || ''}</small></td>
            <td>${u.country}</td>
            <td>
                <span class="badge">GPA: ${u.minGPA || 'N/A'}</span><br>
                <small>Lang: ${u.ieltsReq || 'N/A'}</small>
            </td>
            <td>$${Number(u.semesterFee).toLocaleString()}</td>
            <td style="color:#2ecc71; font-weight:bold;">৳ ${comm.toLocaleString()}</td>
            <td><button class="btn-apply" onclick="openApply('${u.universityName}', ${u.partnerComm}, ${u.semesterFee})">Apply</button></td>
        </tr>`;
    }).join('');
    
    document.getElementById('matchCount').innerText = `${data.length} Universities Found`;
}

// --- ২. ফাইল আপলোড (Cloudinary) এবং সাবমিশন ---
window.openApply = (uniName, commPct, fee) => {
    document.getElementById('targetUni').innerText = uniName;
    document.getElementById('applyModal').style.display = 'flex';
    window.currentAppData = { uniName, commPct, fee };
};

document.getElementById('submitApp').onclick = async () => {
    const btn = document.getElementById('submitApp');
    const sName = document.getElementById('sName').value;
    if(!sName) return alert("Student Name is required!");

    btn.innerText = "Uploading to Cloudinary...";
    btn.disabled = true;

    try {
        const fileIds = ['pdf1', 'pdf2', 'pdf3', 'pdf4'];
        let uploadedUrls = {};

        for (let id of fileIds) {
            const file = document.getElementById(id).files[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "ihp_upload"); // আপনার Cloudinary Preset

                const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", {
                    method: "POST",
                    body: formData
                });
                const d = await res.json();
                uploadedUrls[id] = d.secure_url; // সরাসরি ভিউ লিঙ্ক
            }
        }

        // Firebase-এ ডাটা সেভ
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            university: window.currentAppData.uniName,
            commission: ((window.currentAppData.fee * window.currentAppData.commPct) / 100) * 120,
            partnerEmail: localStorage.getItem('userEmail'),
            partnerName: localStorage.getItem('partnerName') || 'Partner',
            status: 'processing',
            docs: uploadedUrls,
            createdAt: serverTimestamp()
        });

        alert("Application Submitted Successfully!");
        location.reload();

    } catch (error) {
        console.error(error);
        alert("Submission Failed!");
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
};

// --- ৩. ফাইল ট্র্যাকিং ---
function initTracking() {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackResults');
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const viewLink = d.docs?.pdf1 ? `<a href="${d.docs.pdf1}" target="_blank" style="color:#f1c40f;">View Docs</a>` : 'No Docs';
            
            tbody.innerHTML += `<tr>
                <td><b>${d.studentName}</b></td>
                <td>${d.university}</td>
                <td>${viewLink}</td>
                <td><span style="color:#f1c40f;">${d.status.toUpperCase()}</span></td>
            </tr>`;
        });
    });
}

initSmartSearch();
initTracking();
