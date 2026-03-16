import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let selectedUni = "";
const BDT_RATE = 155; // উদাহরণ: ১ পাউন্ড = ১৫৫ টাকা (এটি আপনি ডাইনামিকও করতে পারেন)

// ১. সার্চ ও কমিশন লজিক
document.getElementById('runSearchBtn').onclick = async () => {
    const country = document.getElementById('fCountry').value.trim();
    const resultsBody = document.getElementById('uniResultsBody');
    if(!country) return alert("Please enter country!");

    resultsBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Calculating Commission & Results...</td></tr>";
    document.getElementById('resArea').style.display = 'block';

    const q = query(collection(db, "universities"), where("country", "==", country));
    const snap = await getDocs(q);
    resultsBody.innerHTML = "";

    snap.forEach(doc => {
        const uni = doc.data();
        
        // কমিশন লজিক: (Tuition Fee * Exchange Rate) * (Partner % / 100)
        const tuitionInTaka = (uni.tuitionFeeAmount || 0) * BDT_RATE;
        const calculatedComm = (tuitionInTaka * (uni.partnerCommPercentage || 0)) / 100;

        resultsBody.innerHTML += `
            <tr>
                <td><b>${uni.universityName}</b></td>
                <td>${uni.country}</td>
                <td>${uni.degree}</td>
                <td>${uni.intake || 'N/A'}</td>
                <td>${uni.duration || 'N/A'}</td>
                <td>${uni.currency || '£'} ${uni.tuitionFeeAmount}</td>
                <td>${uni.scholarship || 'N/A'}</td>
                <td>${uni.entryReq || 'N/A'}</td>
                <td>${uni.engReq || 'N/A'}</td>
                <td style="color:var(--gold); font-weight:bold;">৳ ${calculatedComm.toLocaleString('en-IN')}</td>
                <td><button class="btn-gold" onclick="openApply('${uni.universityName}')">Apply</button></td>
            </tr>`;
    });
};

// ২. ফাইল আপলোড ফিক্স (Submit Loading Fix)
window.openApply = (uni) => {
    selectedUni = uni;
    document.getElementById('appModal').style.display = 'flex';
    document.getElementById('formStep').style.display = 'block';
    document.getElementById('successStep').style.display = 'none';
};

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPass').value;
    
    const f1 = document.getElementById('pdfPass').files[0];
    const f2 = document.getElementById('pdfAcad').files[0];
    const f3 = document.getElementById('pdfLang').files[0];

    if(!sName || !sPass || !f1 || !f2 || !f3) return alert("All fields and 3 PDFs are required!");

    btn.innerText = "Uploading... Please wait";
    btn.disabled = true;

    try {
        const uploadTask = async (file, label) => {
            const fileRef = ref(storage, `apps/${sPass}/${label}_${Date.now()}`);
            const snapshot = await uploadBytes(fileRef, file);
            return await getDownloadURL(snapshot.ref);
        };

        // ফাইলগুলো আপলোড হচ্ছে
        const url1 = await uploadTask(f1, "passport");
        const url2 = await uploadTask(f2, "academic");
        const url3 = await uploadTask(f3, "language");

        // ডাটাবেজে এন্ট্রি
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: selectedUni,
            partnerEmail: auth.currentUser.email,
            docs: { passport: url1, academic: url2, language: url3 },
            status: "Pending",
            timestamp: serverTimestamp()
        });

        // সফল হলে QR কোড দেখানো
        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "ID: " + docRef.id;

        new QRCode(document.getElementById("qrcode"), {
            text: docRef.id,
            width: 128, height: 128,
            colorDark: "#0b012d", colorLight: "#ffffff"
        });

    } catch (e) {
        console.error(e);
        alert("Upload Failed! Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
};