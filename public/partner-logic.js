import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const BDT_RATE = 155;

// ১. অথেনটিকেশন ও প্রোফাইল সিঙ্ক
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const pRef = doc(db, "partners", user.uid);
        const pSnap = await getDoc(pRef);
        
        if (pSnap.exists()) {
            const data = pSnap.data();
            document.getElementById('pNameText').innerText = data.fullName || user.email.split('@')[0];
            
            // উইথড্র বাটন লজিক
            const balance = parseFloat(data.walletAmount || 0);
            document.getElementById('availAm').innerText = `৳ ${balance.toLocaleString()}`;
            document.getElementById('walletBalance').innerText = `৳ ${balance.toLocaleString()}`;
            if(balance > 0) { document.getElementById('withdrawBtn').disabled = false; }
        }

        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        
        // ট্র্যাকিং লোড করা হচ্ছে
        startTracking(user.email);
    } else {
        window.location.replace("index.html");
    }
});

// ২. রিয়েল-টাইম অ্যাডমিন ডাটা সার্চ (Flexible Field Logic)
document.addEventListener('click', async (e) => {
    if(e.target && e.target.id === 'runSearchBtn') {
        const countryInput = document.getElementById('fCountry').value.trim();
        const resultsBody = document.getElementById('uniResultsBody');
        
        if(!countryInput) return alert("Please type a country name!");

        document.getElementById('resArea').style.display = 'block';
        resultsBody.innerHTML = "<tr><td colspan='7'>Fetching Real-time Admin Records...</td></tr>";

        // অ্যাডমিন থেকে ডাটা আনা (Case Insensitive logic)
        const q = query(collection(db, "universities"), where("country", "==", countryInput));
        
        onSnapshot(q, (snap) => {
            resultsBody.innerHTML = "";
            if(snap.empty) {
                resultsBody.innerHTML = "<tr><td colspan='7'>No data found in Admin for this country.</td></tr>";
                return;
            }

            snap.forEach(d => {
                const uni = d.data();
                // অ্যাডমিনের ডাটা স্ট্রাকচার যেমনই হোক তা হ্যান্ডেল করা
                const uName = uni.universityName || uni.name || "N/A";
                const uFee = parseFloat(uni.tuitionFeeAmount || uni.tuitionFee || 0);
                const uComm = parseFloat(uni.partnerCommPercentage || uni.commission || 0);
                const calcComm = (uFee * BDT_RATE * uComm) / 100;

                resultsBody.innerHTML += `
                    <tr>
                        <td><b>${uName}</b></td>
                        <td>${uni.country}</td>
                        <td>${uni.degree || 'Various'}</td>
                        <td>${uni.intake || 'N/A'}</td>
                        <td>${uni.currency || '£'}${uFee}</td>
                        <td style="color:var(--gold)">৳ ${calcComm.toLocaleString()}</td>
                        <td><button class="btn-gold" onclick="window.openApply('${uName}')">Apply</button></td>
                    </tr>`;
            });
        });
    }
});

// ৩. ফাইল আপলোড ও সাবমিশন ফিক্স (Loading Issue Fix)
window.openApply = (n) => { 
    window.selectedUni = n; 
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

    if(!sName || !sContact || !sPass || !f1) return alert("All fields and Passport PDF are mandatory!");
    
    btn.disabled = true; 
    btn.innerText = "Processing... Please wait";

    try {
        const up = async (file, label) => {
            if(!file) return "";
            const storageRef = ref(storage, `apps/${sPass}/${label}_${Date.now()}`);
            const uploadTask = await uploadBytes(storageRef, file);
            return await getDownloadURL(uploadTask.ref);
        };

        const [u1, u2, u3] = await Promise.all([
            up(f1, "passport"),
            up(f2, "academic"),
            up(f3, "language")
        ]);

        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName,
            studentContact: sContact,
            passportNo: sPass,
            university: window.selectedUni,
            partnerEmail: auth.currentUser.email,
            status: "Pending",
            complianceMember: "Assigning...",
            docs: { passport: u1, academic: u2, language: u3 },
            submittedAt: serverTimestamp()
        });

        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "Application ID: " + docRef.id;
        new QRCode(document.getElementById("qrcode"), docRef.id);
        
    } catch (e) { 
        console.error(e);
        alert("Submission Failed! Error: " + e.message); 
        btn.disabled = false; 
        btn.innerText = "Submit Now";
    }
};

// ৪. লাইভ ট্র্যাকিং ফিক্স (Real-time Flow)
function startTracking(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    
    onSnapshot(q, (snap) => {
        const dashBody = document.getElementById('fullTrackingBody');
        if(dashBody) {
            dashBody.innerHTML = "";
            if(snap.empty) {
                dashBody.innerHTML = "<tr><td colspan='8'>No applications found.</td></tr>";
            }
            snap.forEach(d => {
                const a = d.data();
                const date = a.submittedAt ? a.submittedAt.toDate().toLocaleDateString() : "Pending";
                
                dashBody.innerHTML += `<tr>
                    <td>${a.studentName}</td>
                    <td>${a.studentContact}</td>
                    <td>${a.passportNo}</td>
                    <td>${a.university}</td>
                    <td><b style="color:var(--gold)">${a.status}</b></td>
                    <td>${a.complianceMember || 'TBA'}</td>
                    <td><a href="${a.docs?.passport}" target="_blank" style="color:var(--gold); text-decoration:none;"><i class="fa-solid fa-file-pdf"></i> View</a></td>
                    <td>${date}</td>
                </tr>`;
            });
        }
    });
}