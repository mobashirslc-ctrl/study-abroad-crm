import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
  authDomain: "scc-partner-portal.firebaseapp.com",
  databaseURL: "https://scc-partner-portal-default-rtdb.firebaseio.com",
  projectId: "scc-partner-portal",
  storageBucket: "scc-partner-portal.firebasestorage.app",
  messagingSenderId: "13013457431",
  appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- ১. পেজ লোড ও পার্টনার ভেরিফিকেশন ---
document.addEventListener('DOMContentLoaded', () => {
    const partnerData = JSON.parse(localStorage.getItem('partnerData'));
    if (partnerData) {
        document.getElementById('partnerNameDisplay').innerText = partnerData.name;
        loadTrackingData(partnerData.name);
    } else {
        window.location.href = 'index.html'; // লগইন না থাকলে ফেরত পাঠাবে
    }
});

// --- ২. স্মার্ট অ্যাসেসমেন্ট সার্চ লজিক ---
const assessmentBtn = document.querySelector('.btn-gold');
if(assessmentBtn) {
    assessmentBtn.addEventListener('click', async () => {
        const table = document.getElementById('assessmentResults');
        table.innerHTML = `<tr><td colspan="11" style="text-align:center;">Analyzing Universities...</td></tr>`;

        try {
            const q = query(collection(db, "universities"));
            const snap = await getDocs(q);
            table.innerHTML = "";

            if (snap.empty) {
                table.innerHTML = `<tr><td colspan="11" style="text-align:center;">No Universities found in Database.</td></tr>`;
                return;
            }

            snap.forEach(doc => {
                const u = doc.data();
                // কারেন্সি ক্যালকুলেশন (অ্যাডমিন থেকে রেট না থাকলে ডিফল্ট ১৫০ ধরা হয়েছে)
                const rate = u.currencyRate || 150; 
                const bdtTotal = u.tuitionFee * rate;
                const commission = (bdtTotal * (u.partnerPercent / 100)).toFixed(0);

                table.innerHTML += `
                    <tr>
                        <td>${u.name}</td><td>${u.country}</td><td>${u.course}</td><td>${u.intake}</td><td>${u.duration}</td>
                        <td>${u.tuitionFee} ${u.currency}</td><td>${u.currency}</td>
                        <td>৳ ${parseInt(bdtTotal).toLocaleString()}</td>
                        <td>${u.partnerPercent}%</td>
                        <td style="color:#ffcc00; font-weight:bold;">৳ ${parseInt(commission).toLocaleString()}</td>
                        <td><button class="btn-gold" style="padding:5px 10px; font-size:10px;" onclick="openApplyForm('${u.name}')">File Opening</button></td>
                    </tr>
                `;
            });
        } catch (e) {
            console.error("Search Error:", e);
            table.innerHTML = `<tr><td colspan="11" style="text-align:center; color:red;">Database Connection Failed.</td></tr>`;
        }
    });
}

// --- ৩. ফাইল ওপেনিং পপআপ কন্ট্রোল ---
window.openApplyForm = (uni) => {
    document.getElementById('sUni').value = uni;
    document.getElementById('studentFormModal').style.display = 'flex';
};

// --- ৪. অ্যাপ্লিকেশন সাবমিট ও পিডিএফ আপলোড লজিক ---
const submitBtn = document.getElementById('submitAppBtn');
if(submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const partnerData = JSON.parse(localStorage.getItem('partnerData'));
        
        // ইনপুট ডেটা সংগ্রহ
        const sName = document.getElementById('sName').value.trim();
        const sPass = document.getElementById('sPass').value.trim();
        const sPhone = document.getElementById('sPhone').value.trim();
        const sUni = document.getElementById('sUni').value;

        const file1 = document.getElementById('fileAcad').files[0];
        const file2 = document.getElementById('fileLang').files[0];
        const file3 = document.getElementById('filePassport').files[0];

        // ভ্যালিডেশন
        if(!sName || !sPass || !file3) {
            alert("Mandatory: Student Name, Passport No & Passport PDF required!");
            return;
        }

        submitBtn.innerText = "Uploading & Saving...";
        submitBtn.disabled = true;

        try {
            // ফাইল আপলোড ফাংশন
            const uploadToStorage = async (file, prefix) => {
                if(!file) return null;
                const fileRef = ref(storage, `applications/${sPass}/${prefix}_${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            };

            const academicUrl = await uploadToStorage(file1, 'ACAD');
            const languageUrl = await uploadToStorage(file2, 'LANG');
            const passportUrl = await uploadToStorage(file3, 'PASS');

            // Firestore-এ অ্যাপ্লিকেশন জমা দেওয়া
            await addDoc(collection(db, "applications"), {
                studentName: sName,
                passportNo: sPass,
                contactNo: sPhone,
                university: sUni,
                partnerName: partnerData.name,
                status: "Pending Compliance",
                academicDoc: academicUrl,
                languageDoc: languageUrl,
                passportDoc: passportUrl,
                createdAt: serverTimestamp(),
                lastUpdate: new Date().toLocaleString()
            });

            alert("Application Successful! Generating Receipt...");
            generatePrintSlip(sName, sPass, sUni, partnerData.name);
            location.reload(); // পেজ রিফ্রেশ করে লিস্ট আপডেট করা

        } catch (error) {
            console.error("Submission Error:", error);
            alert("Failed to submit application. Check internet or storage permissions.");
            submitBtn.innerText = "Submit Application";
            submitBtn.disabled = false;
        }
    });
}

// --- ৫. একনলেজমেন্ট স্লিপ প্রিন্ট (QR Code সহ) ---
function generatePrintSlip(name, pass, uni, partner) {
    const trackUrl = `https://study-abroad-crm.onrender.com/track.html?id=${pass}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackUrl)}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Acknowledgement Slip - SCC</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; text-align: center; }
                .border-box { border: 3px solid #ffcc00; padding: 20px; border-radius: 15px; }
                .header { margin-bottom: 20px; }
                .details { text-align: left; margin: 20px auto; max-width: 400px; line-height: 1.8; }
                .footer-text { font-size: 12px; color: #777; margin-top: 30px; }
                .qr-section { margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="border-box">
                <div class="header">
                    <img src="logo.jpeg" width="120" onerror="this.src='https://via.placeholder.com/120x50?text=SCC+LOGO'">
                    <h1 style="color:#0b012d; margin:10px 0;">Congratulations!</h1>
                    <p>Your Study Abroad application has been initiated.</p>
                </div>
                <hr>
                <div class="details">
                    <div><b>Student Name:</b> ${name}</div>
                    <div><b>Passport Number:</b> ${pass}</div>
                    <div><b>University:</b> ${uni}</div>
                    <div><b>Applied Through:</b> ${partner}</div>
                    <div><b>Status:</b> Pending Compliance</div>
                </div>
                <hr>
                <div class="qr-section">
                    <p><b>Scan to Track Your File Status</b></p>
                    <img src="${qrCode
