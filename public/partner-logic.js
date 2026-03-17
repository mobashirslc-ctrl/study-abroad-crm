import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_lOiKJFhvY1iL1jDA1KLVD6sHDNXlo0I",
  authDomain: "ihp-global-portal.firebaseapp.com",
  projectId: "ihp-global-portal",
  storageBucket: "ihp-global-portal.firebasestorage.app",
  messagingSenderId: "623093397069",
  appId: "1:623093397069:web:de3b3b7b1df15ad444ce04",
  measurementId: "G-2ZZQYJ1TY6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ১. পেজ লোড লজিক
document.addEventListener('DOMContentLoaded', () => {
    const partnerData = JSON.parse(localStorage.getItem('partnerData'));
    if (partnerData) {
        document.getElementById('partnerNameDisplay').innerText = partnerData.name;
        loadTrackingData(partnerData.name);
    }
});

// ২. ইউনিভার্সিটি সার্চ ফিক্স (স্মার্ট অ্যাসেসমেন্ট)
const searchBtn = document.querySelector('.btn-gold');
if(searchBtn) {
    searchBtn.onclick = async () => {
        const table = document.getElementById('assessmentResults');
        table.innerHTML = `<tr><td colspan="11" style="text-align:center;">Searching in Database...</td></tr>`;

        try {
            const snap = await getDocs(collection(db, "universities"));
            if (snap.empty) {
                table.innerHTML = `<tr><td colspan="11" style="text-align:center;">No data in 'universities' collection! Please add some in Firestore.</td></tr>`;
                return;
            }
            table.innerHTML = "";
            snap.forEach(doc => {
                const u = doc.data();
                const rate = u.currencyRate || 150;
                const bdt = u.tuitionFee * rate;
                const comm = (bdt * (u.partnerPercent / 100)).toFixed(0);

                table.innerHTML += `
                    <tr>
                        <td>${u.name}</td><td>${u.country}</td><td>${u.course}</td><td>${u.intake}</td><td>${u.duration}</td>
                        <td>${u.tuitionFee}</td><td>${u.currency}</td><td>৳ ${parseInt(bdt).toLocaleString()}</td>
                        <td>${u.partnerPercent}%</td><td>৳ ${parseInt(comm).toLocaleString()}</td>
                        <td><button class="btn-gold" style="padding:5px 10px; font-size:10px;" onclick="openApplyForm('${u.name}')">File Opening</button></td>
                    </tr>`;
            });
        } catch (err) {
            console.error("Search Error:", err);
            table.innerHTML = `<tr><td colspan="11" style="text-align:center; color:red;">Database Error! Check Firestore.</td></tr>`;
        }
    };
}

// ৩. ফর্ম ওপেন
window.openApplyForm = (uni) => {
    document.getElementById('sUni').value = uni;
    document.getElementById('studentFormModal').style.display = 'flex';
};

// ৪. সাবমিট লজিক (PDF Upload & Save)
const submitBtn = document.getElementById('submitAppBtn');
if(submitBtn) {
    submitBtn.onclick = async () => {
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        const sUni = document.getElementById('sUni').value;
        const file3 = document.getElementById('filePassport').files[0];

        if(!sName || !sPass || !file3) {
            alert("Student Name, Passport No & Passport PDF are mandatory!");
            return;
        }

        submitBtn.innerText = "Processing Documents...";
        submitBtn.disabled = true;

        try {
            // PDF আপলোড লজিক
            const passRef = ref(storage, `applications/${sPass}/passport_${Date.now()}_${file3.name}`);
            const uploadTask = await uploadBytes(passRef, file3);
            const passUrl = await getDownloadURL(uploadTask.ref);

            // ডাটা সেভ
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNo: sPass,
                university: sUni,
                partnerName: partnerData.name,
                status: "Pending Compliance",
                passportDoc: passUrl,
                createdAt: serverTimestamp()
            });

            alert("Submission Successful! Generating QR Slip...");
            // স্লিপ ফাংশন কল করা যেতে পারে এখানে
            location.reload();
        } catch (error) {
            console.error("Submit Error:", error);
            alert("Upload Failed! Make sure Storage is enabled in 'us-central'. Error: " + error.message);
            submitBtn.innerText = "Submit Application";
            submitBtn.disabled = false;
        }
    };
}

// ৫. ট্র্যাকিং ডেটা লোড
async function loadTrackingData(pName) {
    const tbody = document.getElementById('trackingBody');
    if(!tbody) return;
    const snap = await getDocs(query(collection(db, "applications"), where("partnerName", "==", pName)));
    tbody.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data();
        tbody.innerHTML += `<tr><td>${d.studentName}</td><td>${d.contactNo || '-'}</td><td>${d.passportNo}</td><td>${d.status}</td><td>Officer</td><td><a href="${d.passportDoc}" target="_blank">View</a></td><td>Recent</td></tr>`;
    });
}
