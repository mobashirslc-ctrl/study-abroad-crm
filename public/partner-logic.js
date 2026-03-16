import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const BDT_RATE = 155;

// ১. অথেনটিকেশন এবং রিয়েল পার্টনার নেম লক
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const pRef = doc(db, "partners", user.uid);
        const pSnap = await getDoc(pRef);
        document.getElementById('pNameText').innerText = pSnap.exists() ? pSnap.data().fullName : user.email.split('@')[0];
        
        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        
        // রিয়েল-টাইম ট্র্যাকিং শুরু
        startLiveTracking(user.email);
    } else {
        window.location.replace("index.html");
    }
});

// ২. রিয়েল-টাইম ইউনিভার্সিটি সার্চ (Admin Data Sync)
document.getElementById('runSearchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.trim();
    const degree = document.getElementById('fDegree').value;
    const lang = document.getElementById('fLang').value; // Language Dropdown
    const resultsBody = document.getElementById('uniResultsBody');
    
    if(!country) return alert("Please enter a country name first!");
    
    document.getElementById('resArea').style.display = 'block';
    resultsBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Searching Live Admin Records...</td></tr>";

    // Firestore থেকে রিয়েল-টাইম লিসেনার (onSnapshot)
    const q = query(collection(db, "universities"), where("country", "==", country));
    
    onSnapshot(q, (snap) => {
        resultsBody.innerHTML = "";
        if(snap.empty) {
            resultsBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>No matching university found in Admin records.</td></tr>";
            return;
        }

        snap.forEach(docSnap => {
            const uni = docSnap.data();
            
            // স্মার্ট ফিল্টারিং
            if(degree && !uni.degree?.includes(degree)) return;

            const tuition = parseFloat(uni.tuitionFee || uni.tuitionFeeAmount || 0);
            const commPercent = parseFloat(uni.partnerCommPercentage || 0);
            const finalComm = (tuition * BDT_RATE * commPercent) / 100;

            resultsBody.innerHTML += `
                <tr>
                    <td><b>${uni.universityName}</b></td>
                    <td>${uni.country}</td>
                    <td>${uni.degree || 'Various'}</td>
                    <td>${uni.intake || 'N/A'}</td>
                    <td>${uni.currency || '£'}${tuition}</td>
                    <td style="color:var(--gold); font-weight:bold;">৳ ${finalComm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="window.openApply('${uni.universityName}')">Apply</button></td>
                </tr>`;
        });
    });
};

// ৩. অ্যাপ্লাই বাটন ও ফাইল সাবমিশন লজিক
window.openApply = (uniName) => {
    window.currentUni = uniName;
    document.getElementById('appModal').style.display = 'flex';
};

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    const sName = document.getElementById('sName').value;
    const sContact = document.getElementById('sContact').value;
    const sPass = document.getElementById('sPass').value;
    const f1 = document.getElementById('pdfPass').files[0];
    const f2 = document.getElementById('pdfAcad').files[0];
    const f3 = document.getElementById('pdfLang').files[0];

    if(!sName || !sContact || !sPass || !f1 || !f2 || !f3) return alert("Fill all fields and upload 3 PDFs!");

    btn.innerText = "Uploading to Cloud...";
    btn.disabled = true;

    try {
        const uploadFile = async (file, folder) => {
            const sRef = ref(storage, `applications/${sPass}/${folder}_${Date.now()}.pdf`);
            await uploadBytes(sRef, file);
            return await getDownloadURL(sRef);
        };

        const [pUrl, aUrl, lUrl] = await Promise.all([
            uploadFile(f1, "passport"),
            uploadFile(f2, "academic"),
            uploadFile(f3, "language")
        ]);

        const appRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            studentContact: sContact,
            passportNo: sPass,
            university: window.currentUni,
            partnerEmail: auth.currentUser.email,
            status: "Pending",
            complianceMember: "Assigning...",
            docs: { passport: pUrl, academic: aUrl, language: lUrl },
            submittedAt: serverTimestamp()
        });

        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "ID: " + appRef.id;
        new QRCode(document.getElementById("qrcode"), appRef.id);

    } catch (e) {
        alert("Upload Error! Please check your connection.");
        btn.disabled = false;
        btn.innerText = "Submit Now";
    }
};

// ৪. লাইভ ট্র্যাকিং লজিক (রিয়েল-টাইম অ্যাডমিন আপডেট)
function startLiveTracking(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('fullTrackingBody');
        tbody.innerHTML = "";
        
        snap.forEach(docSnap => {
            const app = docSnap.data();
            const date = app.submittedAt ? app.submittedAt.toDate().toLocaleDateString() : 'Syncing...';
            
            tbody.innerHTML += `
                <tr>
                    <td>${app.studentName}</td>
                    <td>${app.studentContact}</td>
                    <td>${app.passportNo}</td>
                    <td>${app.university}</td>
                    <td><span style="color:var(--gold); border:1px solid var(--gold); padding:2px 6px; border-radius:4px; font-size:10px;">${app.status}</span></td>
                    <td>${app.complianceMember}</td>
                    <td><a href="${app.docs?.passport}" target="_blank" style="color:var(--gold)"><i class="fa-solid fa-file-pdf"></i> View</a></td>
                    <td>${date}</td>
                </tr>`;
        });
    });
}

document.getElementById('logoutBtn').onclick = () => signOut(auth);