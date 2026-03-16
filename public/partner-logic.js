import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let selectedUni = "";
const BDT_RATE = 155; // Exchange rate

// ১. ড্যাশবোর্ড লক এবং রিডাইরেক্ট ফিক্স
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        loadTrackingData(user.email); // রিয়েল-টাইম ট্র্যাকিং শুরু
    } else {
        window.location.replace("index.html"); // পারমানেন্ট লক
    }
});

// ২. রিয়েল-টাইম সার্চ লজিক
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.trim();
    const degree = document.getElementById('fDegree').value;
    const resultsBody = document.getElementById('uniResultsBody');
    
    if(!country) return alert("Please enter a country!");

    resultsBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Searching Universities...</td></tr>";
    document.getElementById('resArea').style.display = 'block';

    try {
        let q = query(collection(db, "universities"), where("country", "==", country));
        const snap = await getDocs(q);
        resultsBody.innerHTML = "";

        if(snap.empty) {
            resultsBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>No universities found.</td></tr>";
            return;
        }

        snap.forEach(doc => {
            const uni = doc.data();
            // ফিল্টারিং লজিক (যদি ডিগ্রি সিলেক্ট থাকে)
            if(degree && uni.degree !== degree) return;

            // কমিশন ক্যালকুলেশন
            const tuition = parseFloat(uni.tuitionFeeAmount) || 0;
            const percentage = parseFloat(uni.partnerCommPercentage) || 0;
            const commInBDT = (tuition * BDT_RATE * percentage) / 100;

            resultsBody.innerHTML += `
                <tr>
                    <td><b>${uni.universityName}</b></td>
                    <td>${uni.country}</td>
                    <td>${uni.degree}</td>
                    <td>${uni.intake || 'N/A'}</td>
                    <td>${uni.duration || 'N/A'}</td>
                    <td>${uni.currency || '£'}${uni.tuitionFeeAmount}</td>
                    <td>${uni.scholarship || 'N/A'}</td>
                    <td>${uni.entryReq || 'N/A'}</td>
                    <td>${uni.engReq || 'N/A'}</td>
                    <td style="color:var(--gold); font-weight:bold;">৳ ${commInBDT.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="window.openApply('${uni.universityName}')">Apply</button></td>
                </tr>`;
        });
    } catch (e) { alert("Search failed!"); }
};

// ৩. ফাইল আপলোড এবং ফর্ম সাবমিট (Fix)
window.openApply = (uni) => {
    selectedUni = uni;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    const f1 = document.getElementById('pdfPass').files[0];
    const f2 = document.getElementById('pdfAcad').files[0];
    const f3 = document.getElementById('pdfLang').files[0];

    if(!sName || !sPass || !f1 || !f2 || !f3) return alert("All files and info required!");

    btn.innerText = "Submitting...";
    btn.disabled = true;

    try {
        const upload = async (file, prefix) => {
            const storageRef = ref(storage, `applications/${sPass}/${prefix}_${Date.now()}.pdf`);
            const snap = await uploadBytes(storageRef, file);
            return await getDownloadURL(snap.ref);
        };

        const u1 = await upload(f1, "passport");
        const u2 = await upload(f2, "academic");
        const u3 = await upload(f3, "language");

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: selectedUni,
            partnerEmail: auth.currentUser.email,
            docs: { passport: u1, academic: u2, language: u3 },
            status: "Pending",
            submittedAt: serverTimestamp()
        });

        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "ID: " + docRef.id;
        new QRCode(document.getElementById("qrcode"), docRef.id);

    } catch (e) {
        alert("Submission Error!");
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
};

// ৪. রিয়েল-টাইম ট্র্যাকিং ডাটা লোড
function loadTrackingData(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('fullTrackingBody');
        tbody.innerHTML = "";
        snap.forEach(doc => {
            const app = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.passport}</td>
                    <td>${app.university}</td>
                    <td style="color:var(--gold)">${app.status}</td>
                    <td>${app.submittedAt ? app.submittedAt.toDate().toLocaleDateString() : 'Just now'}</td>
                </tr>`;
        });
    });
}

document.getElementById('logoutBtn').onclick = () => signOut(auth);