import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let selectedUni = "";
const BDT_RATE = 155; // ১ পাউন্ড = ১৫৫ টাকা (অ্যাডজাস্টযোগ্য)

// ১. পেজ লোড ও লগইন চেক
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
    } else {
        window.location.href = "index.html"; // লগইন পেজে পাঠাবে
    }
});

// ২. ক্যালকুলেশন ও সার্চ
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.trim();
    const resultsBody = document.getElementById('uniResultsBody');
    if(!country) return alert("Please enter country!");

    resultsBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Processing Assessment...</td></tr>";
    document.getElementById('resArea').style.display = 'block';

    try {
        const q = query(collection(db, "universities"), where("country", "==", country));
        const snap = await getDocs(q);
        resultsBody.innerHTML = "";

        snap.forEach(doc => {
            const uni = doc.data();
            const tuitionInTaka = (uni.tuitionFeeAmount || 0) * BDT_RATE;
            const calculatedComm = (tuitionInTaka * (uni.partnerCommPercentage || 0)) / 100;

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
                    <td style="color:var(--gold); font-weight:bold;">৳ ${calculatedComm.toLocaleString('en-IN')}</td>
                    <td><button class="btn-gold" onclick="openApply('${uni.universityName}')">Apply</button></td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
};

// ৩. ফাইল সাবমিশন লজিক (সাদা হয়ে যাওয়া বন্ধ করবে)
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

    if(!sName || !sPass || !f1 || !f2 || !f3) return alert("Fill all fields and upload 3 PDFs!");

    btn.innerText = "Uploading Documents...";
    btn.disabled = true;

    try {
        const upload = async (file, name) => {
            const r = ref(storage, `apps/${sPass}/${name}_${Date.now()}`);
            await uploadBytes(r, file);
            return await getDownloadURL(r);
        };

        const u1 = await upload(f1, "pass");
        const u2 = await upload(f2, "acad");
        const u3 = await upload(f3, "lang");

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            passport: sPass,
            university: selectedUni,
            partner: auth.currentUser.email,
            docs: { p: u1, a: u2, l: u3 },
            status: "Pending",
            at: serverTimestamp()
        });

        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "App ID: " + docRef.id;
        new QRCode(document.getElementById("qrcode"), { text: docRef.id, width: 120, height: 120 });

    } catch (e) {
        alert("Upload Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
};

document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.href="index.html");