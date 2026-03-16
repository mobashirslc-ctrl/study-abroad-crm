import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUni = "";

// ১. অথেনটিকেশন চেক
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
    } else {
        window.location.href = "index.html";
    }
});

// ২. ইউনিভার্সিটি সার্চ (১১টি ফিল্ড অনুযায়ী)
document.getElementById('runSearchBtn').addEventListener('click', async () => {
    const country = document.getElementById('fCountry').value.trim();
    const resultsBody = document.getElementById('uniResultsBody');
    const resArea = document.getElementById('resArea');

    if (!country) return alert("Please enter a country name.");

    resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Analyzing Database...</td></tr>";
    resArea.style.display = 'block';

    try {
        const q = query(collection(db, "universities"), where("country", "==", country));
        const snap = await getDocs(q);
        resultsBody.innerHTML = "";

        if (snap.empty) {
            resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No University found for this country.</td></tr>";
            return;
        }

        snap.forEach(doc => {
            const uni = doc.data();
            resultsBody.innerHTML += `
                <tr>
                    <td>${uni.universityName}</td>
                    <td>${uni.country}</td>
                    <td>${uni.degree}</td>
                    <td style="color:var(--gold); font-weight:bold;">৳ ${uni.partnerComm || '0'}</td>
                    <td><button class="btn-gold" onclick="openModal('${uni.universityName}')">Apply</button></td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
});

// ৩. মোডাল কন্ট্রোল
window.openModal = (uni) => {
    currentUni = uni;
    document.getElementById('mTitle').innerText = "Apply for " + uni;
    document.getElementById('appModal').style.display = 'flex';
};

// ৪. ফাইল আপলোড এবং অ্যাপ্লিকেশন সাবমিট
document.getElementById('submitBtn').addEventListener('click', async () => {
    const name = document.getElementById('sName').value;
    const pass = document.getElementById('sPass').value;
    const btn = document.getElementById('submitBtn');

    const file1 = document.getElementById('pdfPass').files[0];
    const file2 = document.getElementById('pdfAcad').files[0];
    const file3 = document.getElementById('pdfLang').files[0];

    if (!name || !pass || !file1 || !file2 || !file3) return alert("Fill all info and upload 3 PDFs!");

    btn.innerText = "Processing Files...";
    btn.disabled = true;

    try {
        // ফাইল আপলোড লজিক
        const uploadFile = async (file, type) => {
            const fileRef = ref(storage, `docs/${pass}_${type}.pdf`);
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        };

        const url1 = await uploadFile(file1, "passport");
        const url2 = await uploadFile(file2, "academic");
        const url3 = await uploadFile(file3, "language");

        // ডাটাবেজে সেভ
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: name,
            passportNo: pass,
            university: currentUni,
            partnerEmail: auth.currentUser.email,
            passportUrl: url1,
            academicUrl: url2,
            languageUrl: url3,
            status: "Pending",
            submittedAt: serverTimestamp()
        });

        // সাকসেস স্লিপ ও QR জেনারেশন
        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "Application ID: " + docRef.id;

        new QRCode(document.getElementById("qrcode"), {
            text: docRef.id,
            width: 150,
            height: 150,
            colorDark: "#ffcc00",
            colorLight: "#160a3d"
        });

    } catch (e) {
        alert("Upload Error! Check file size (Max 2MB per file).");
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
});

// ৫. লগআউট
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});