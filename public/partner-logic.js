import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let selectedUniName = "";

// ১. অথেনটিকেশন এবং লোডার ফিক্স
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');
    if (user) {
        if (loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        console.log("Logged in as:", user.email);
    } else {
        window.location.href = "index.html"; 
    }
});

// ২. ইউনিভার্সিটি সার্চ (রেজাল্ট টেবিলে ১১টি ফিল্ড শো করবে)
const runSearchBtn = document.getElementById('runSearchBtn');
if (runSearchBtn) {
    runSearchBtn.addEventListener('click', async () => {
        const countryInput = document.getElementById('fCountry').value.trim();
        const resultsBody = document.getElementById('uniResultsBody');
        const resArea = document.getElementById('resArea');

        if (!countryInput) {
            alert("Please type a country name!");
            return;
        }

        resultsBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Running Smart Assessment...</td></tr>";
        resArea.style.display = 'block';

        try {
            const q = query(collection(db, "universities"), where("country", "==", countryInput));
            const querySnapshot = await getDocs(q);

            resultsBody.innerHTML = "";
            if (querySnapshot.empty) {
                resultsBody.innerHTML = `<tr><td colspan='11' style='text-align:center;'>No data found for "${countryInput}".</td></tr>`;
                return;
            }

            querySnapshot.forEach((doc) => {
                const uni = doc.data();
                // ১১টি কলামের ডাটা যা অ্যাডমিন প্যানেল থেকে আসবে
                resultsBody.innerHTML += `
                    <tr>
                        <td><b>${uni.universityName || 'N/A'}</b></td>
                        <td>${uni.country || 'N/A'}</td>
                        <td>${uni.degree || 'N/A'}</td>
                        <td>${uni.intake || 'TBA'}</td>
                        <td>${uni.duration || 'N/A'}</td>
                        <td>${uni.tuition || 'N/A'}</td>
                        <td>${uni.scholarship || 'N/A'}</td>
                        <td>${uni.entryReq || 'N/A'}</td>
                        <td>${uni.engReq || 'N/A'}</td>
                        <td style="color:var(--gold); font-weight:bold;">৳ ${uni.partnerComm || '0'}</td>
                        <td><button class="btn-gold" onclick="openApplyModal('${uni.universityName}')">Apply</button></td>
                    </tr>`;
            });
        } catch (error) {
            console.error("Search error:", error);
            alert("Error loading assessment data.");
        }
    });
}

// ৩. অ্যাপ্লিকেশন মোডাল ওপেন লজিক
window.openApplyModal = (uniName) => {
    selectedUniName = uniName;
    document.getElementById('mTitle').innerText = "Apply for " + uniName;
    document.getElementById('appModal').style.display = 'flex';
};

// ৪. ফাইল আপলোড এবং ফাইনাল সাবমিট (QR জেনারেশন সহ)
const finalSubmitBtn = document.getElementById('finalSubmitBtn');
if (finalSubmitBtn) {
    finalSubmitBtn.addEventListener('click', async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        
        const filePass = document.getElementById('pdfPass').files[0];
        const fileAcad = document.getElementById('pdfAcad').files[0];
        const fileLang = document.getElementById('pdfLang').files[0];

        if (!sName || !sPass || !filePass || !fileAcad || !fileLang) {
            alert("Please fill all info and upload all 3 PDF files!");
            return;
        }

        finalSubmitBtn.innerText = "Uploading Documents...";
        finalSubmitBtn.disabled = true;

        try {
            // ফাইল আপলোড ফাংশন
            const uploadFile = async (file, folder) => {
                const storageRef = ref(storage, `applications/${sPass}/${folder}_${Date.now()}.pdf`);
                await uploadBytes(storageRef, file);
                return await getDownloadURL(storageRef);
            };

            const urlPass = await uploadFile(filePass, "passport");
            const urlAcad = await uploadFile(fileAcad, "academic");
            const urlLang = await uploadFile(fileLang, "language");

            // ডাটাবেজে ডাটা সেভ
            const docRef = await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNo: sPass,
                university: selectedUniName,
                passportUrl: urlPass,
                academicUrl: urlAcad,
                languageUrl: urlLang,
                partnerEmail: auth.currentUser.email,
                status: "Pending",
                submittedAt: serverTimestamp()
            });

            // সাকসেস স্লিপ এবং QR কোড দেখানো
            document.getElementById('formStep').style.display = 'none';
            document.getElementById('successStep').style.display = 'block';
            document.getElementById('appIdText').innerText = "App ID: " + docRef.id;

            // QR কোড তৈরি
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = ""; // আগের QR মুছতে
            new QRCode(qrContainer, {
                text: docRef.id,
                width: 128,
                height: 128,
                colorDark : "#0b012d",
                colorLight : "#ffffff"
            });

        } catch (error) {
            console.error("Submission error:", error);
            alert("Submission failed! Check your internet or file size.");
            finalSubmitBtn.disabled = false;
            finalSubmitBtn.innerText = "Submit Application";
        }
    });
}

// ৫. লগআউট লজিক
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html"; 
        });
    });
}