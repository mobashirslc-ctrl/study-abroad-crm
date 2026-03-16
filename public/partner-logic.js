import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const BDT_RATE = 155; // কারেন্সি রেট

// ১. রিয়েল-টাইম ডাটা ও কমিশন ফিক্স
document.getElementById('runSearchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.trim();
    const resultsBody = document.getElementById('uniResultsBody');
    if(!country) return alert("পছন্দের দেশের নাম লিখুন!");

    document.getElementById('resArea').style.display = 'block';
    resultsBody.innerHTML = "<tr><td colspan='7'>Syncing with Admin Records...</td></tr>";

    const q = query(collection(db, "universities"), where("country", "==", country));
    onSnapshot(q, (snap) => {
        resultsBody.innerHTML = "";
        if(snap.empty) {
            resultsBody.innerHTML = "<tr><td colspan='7'>অ্যাডমিন রেকর্ডে কোনো ইউনিভার্সিটি পাওয়া যায়নি।</td></tr>";
            return;
        }
        snap.forEach(d => {
            const uni = d.data();
            
            // ডাটাবেস থেকে ভ্যালু নেওয়ার সময় নামগুলো চেক করুন (অ্যাডমিনের সাথে মিল থাকতে হবে)
            const fee = parseFloat(uni.tuitionFeeAmount || uni.tuitionFee || 0);
            const commPercentage = parseFloat(uni.partnerCommPercentage || uni.commission || 0);
            
            // কমিশন ক্যালকুলেশন (৳)
            const calcComm = (fee * BDT_RATE * commPercentage) / 100;

            resultsBody.innerHTML += `
                <tr>
                    <td><b>${uni.universityName || uni.name}</b></td>
                    <td>${uni.country}</td>
                    <td>${uni.degree || 'Various'}</td>
                    <td>${uni.intake || 'N/A'}</td>
                    <td>${uni.currency || '£'}${fee}</td>
                    <td style="color:var(--gold); font-weight:bold;">৳ ${calcComm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="window.openApply('${uni.universityName || uni.name}')">APPLY</button></td>
                </tr>`;
        });
    });
};

// ২. ফাইল সাবমিশন ও সাকসেস হ্যান্ডলিং (Fixed Processing Issue)
window.openApply = (uni) => { 
    window.selectedUni = uni; 
    document.getElementById('appModal').style.display = 'flex'; 
    document.getElementById('formStep').style.display = 'block';
    document.getElementById('successStep').style.display = 'none';
};

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    const sName = document.getElementById('sName').value;
    const sContact = document.getElementById('sContact').value;
    const sPass = document.getElementById('sPass').value;
    
    // ফাইল সিলেকশন চেক
    const f1 = document.getElementById('pdfPass').files[0];
    const f2 = document.getElementById('pdfAcad').files[0];
    const f3 = document.getElementById('pdfLang').files[0];

    if(!sName || !sPass || !f1) return alert("স্টুডেন্টের নাম, পাসপোর্ট নম্বর এবং অন্তত পাসপোর্ট কপি আপলোড করুন!");
    
    // বাটন লক ও টেক্সট পরিবর্তন
    btn.disabled = true; 
    btn.innerText = "Processing Real-time Upload...";

    try {
        // ফাইল আপলোড ফাংশন
        const uploadTask = async (file, type) => {
            if(!file) return "";
            const storagePath = `applications/${sPass}/${type}_${Date.now()}_${file.name}`;
            const sRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(sRef, file);
            return await getDownloadURL(snapshot.ref);
        };

        // ফাইলগুলো আপলোড শুরু
        const passportURL = await uploadTask(f1, "Passport");
        const academicURL = await uploadTask(f2, "Academic");
        const languageURL = await uploadTask(f3, "Language");

        // ডাটাবেসে অ্যাপ্লিকেশন সেভ
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            studentContact: sContact,
            passportNo: sPass,
            university: window.selectedUni,
            partnerEmail: auth.currentUser.email,
            status: "Pending",
            complianceMember: "Assigning...",
            docs: { 
                passport: passportURL, 
                academic: academicURL, 
                language: languageURL 
            },
            submittedAt: serverTimestamp()
        });

        // সাকসেস স্টেপ দেখানো
        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "Application ID: " + docRef.id;
        
        // কিউআর কোড (যদি লাইব্রেরি থাকে)
        if(window.QRCode) {
            document.getElementById("qrcode").innerHTML = "";
            new QRCode(document.getElementById("qrcode"), docRef.id);
        }

    } catch (error) {
        console.error("Submission Error:", error);
        alert("সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন। এরর: " + error.message);
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
};

// ৩. ট্র্যাকিং টেবিল ফিক্স
function startTracking(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    onSnapshot(q, (snap) => {
        const bodies = ['fullTrackingBody', 'fullTrackingBodyDeep'];
        let html = "";
        
        if(snap.empty) {
            html = "<tr><td colspan='8' style='text-align:center;'>No records found</td></tr>";
        } else {
            snap.forEach(d => {
                const a = d.data();
                const date = a.submittedAt ? a.submittedAt.toDate().toLocaleDateString() : "Syncing...";
                html += `<tr>
                    <td>${a.studentName}</td>
                    <td>${a.studentContact}</td>
                    <td>${a.passportNo}</td>
                    <td>${a.university}</td>
                    <td><b style="color:var(--gold)">${a.status}</b></td>
                    <td>${a.complianceMember}</td>
                    <td><a href="${a.docs?.passport}" target="_blank" style="color:var(--gold)">VIEW PDF</a></td>
                    <td>${date}</td>
                </tr>`;
            });
        }
        
        bodies.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = html;
        });
    });
}

// ৪. অথেনটিকেশন চেক
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        startTracking(user.email);
        
        // প্রোফাইল ডাটা লোড (Name Sync)
        getDoc(doc(db, "partners", user.uid)).then(snap => {
            if(snap.exists()) document.getElementById('pNameText').innerText = snap.data().fullName;
        });
    } else {
        window.location.replace("index.html");
    }
});