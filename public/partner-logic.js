import { db, auth, storage } from "./firebase-config.js";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const BDT_RATE = 155;

// ১. অথেনটিকেশন এবং প্রোফাইল ডাটা লোড
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const pRef = doc(db, "partners", user.uid);
        const pSnap = await getDoc(pRef);
        
        if (pSnap.exists()) {
            const data = pSnap.data();
            document.getElementById('pNameText').innerText = data.fullName || user.email.split('@')[0];
            
            // প্রোফাইল ফিল্ড অটো-ফিল
            if(document.getElementById('profName')) document.getElementById('profName').value = data.fullName || "";
            if(document.getElementById('profAgency')) document.getElementById('profAgency').value = data.agencyName || "";
            if(document.getElementById('profPhone')) document.getElementById('profPhone').value = data.phone || "";
            if(document.getElementById('profAddress')) document.getElementById('profAddress').value = data.address || "";

            // ২. উইথড্র বাটন লজিক (Payment Lock)
            const balance = parseFloat(data.walletAmount || 0);
            document.getElementById('availAm').innerText = `৳ ${balance.toLocaleString()}`;
            document.getElementById('walletBalance').innerText = `৳ ${balance.toLocaleString()}`;
            
            const wBtn = document.getElementById('withdrawBtn');
            if(balance > 0) {
                wBtn.disabled = false;
                wBtn.style.opacity = "1";
            }
        }

        document.getElementById('loader').style.display = 'none';
        document.body.classList.add('auth-ready');
        startTracking(user.email);
    } else {
        window.location.replace("index.html");
    }
});

// ৩. রিয়েল-টাইম অ্যাসেসমেন্ট (Search Fix)
document.addEventListener('click', async (e) => {
    if(e.target && e.target.id === 'runSearchBtn') {
        const country = document.getElementById('fCountry').value.trim();
        const resultsBody = document.getElementById('uniResultsBody');
        if(!country) return alert("Please type a country name!");

        document.getElementById('resArea').style.display = 'block';
        resultsBody.innerHTML = "<tr><td colspan='7'>Syncing with Admin Records...</td></tr>";

        const q = query(collection(db, "universities"), where("country", "==", country));
        onSnapshot(q, (snap) => {
            resultsBody.innerHTML = "";
            snap.forEach(d => {
                const uni = d.data();
                const comm = (parseFloat(uni.tuitionFeeAmount || 0) * BDT_RATE * parseFloat(uni.partnerCommPercentage || 0)) / 100;
                resultsBody.innerHTML += `
                    <tr>
                        <td><b>${uni.universityName}</b></td>
                        <td>${uni.country}</td>
                        <td>${uni.degree}</td>
                        <td>${uni.intake}</td>
                        <td>${uni.currency}${uni.tuitionFeeAmount}</td>
                        <td style="color:var(--gold)">৳ ${comm.toLocaleString()}</td>
                        <td><button class="btn-gold" onclick="window.openApply('${uni.universityName}')">Apply</button></td>
                    </tr>`;
            });
        });
    }
});

// ৪. প্রোফাইল আপডেট লজিক
const saveBtn = document.getElementById('saveProfileBtn');
if(saveBtn) {
    saveBtn.onclick = async () => {
        saveBtn.innerText = "Updating...";
        await updateDoc(doc(db, "partners", auth.currentUser.uid), {
            fullName: document.getElementById('profName').value,
            agencyName: document.getElementById('profAgency').value,
            phone: document.getElementById('profPhone').value,
            address: document.getElementById('profAddress').value
        });
        alert("Profile Updated!");
        saveBtn.innerText = "Update Profile";
    };
}

// ৫. অ্যাপ্লিকেশন সাবমিশন
window.openApply = (n) => { window.selectedUni = n; document.getElementById('appModal').style.display = 'flex'; };

document.getElementById('finalSubmitBtn').onclick = async () => {
    const btn = document.getElementById('finalSubmitBtn');
    const sName = document.getElementById('sName').value;
    const sContact = document.getElementById('sContact').value;
    const sPass = document.getElementById('sPass').value;
    const f1 = document.getElementById('pdfPass').files[0];

    if(!sName || !f1) return alert("All fields and PDFs are required!");
    btn.disabled = true; btn.innerText = "Uploading...";

    try {
        const up = async (f, k) => {
            const r = ref(storage, `apps/${sPass}/${k}_${Date.now()}`);
            await uploadBytes(r, f); return await getDownloadURL(r);
        };
        const u1 = await up(f1, "pass");
        
        const docRef = await addDoc(collection(db, "applications"), {
            studentName: sName, studentContact: sContact, passportNo: sPass,
            university: window.selectedUni, partnerEmail: auth.currentUser.email,
            status: "Pending", complianceMember: "Assigning...",
            docs: { passport: u1 }, submittedAt: serverTimestamp()
        });

        document.getElementById('formStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('appIdText').innerText = "ID: " + docRef.id;
        new QRCode(document.getElementById("qrcode"), docRef.id);
    } catch (e) { alert("Error!"); btn.disabled = false; }
};

// ৬. লাইভ ট্র্যাকিং
function startTracking(email) {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", email));
    onSnapshot(q, (snap) => {
        const body = document.getElementById('fullTrackingBody');
        body.innerHTML = "";
        snap.forEach(d => {
            const a = d.data();
            body.innerHTML += `<tr>
                <td>${a.studentName}</td><td>${a.studentContact}</td><td>${a.passportNo}</td><td>${a.university}</td>
                <td><span style="color:var(--gold)">${a.status}</span></td><td>${a.complianceMember}</td>
                <td><a href="${a.docs.passport}" target="_blank" style="color:var(--gold)">View</a></td>
                <td>${a.submittedAt?.toDate().toLocaleDateString() || 'Sync'}</td>
            </tr>`;
        });
    });
}

document.getElementById('logoutBtn').onclick = () => signOut(auth);