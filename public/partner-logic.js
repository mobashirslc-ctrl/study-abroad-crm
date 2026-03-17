import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBxIzx-mzvUNdywOz5xxSPS9FQYynLHJlg",
    authDomain: "scc-partner-portal.firebaseapp.com",
    projectId: "scc-partner-portal",
    storageBucket: "scc-partner-portal.firebasestorage.app",
    messagingSenderId: "13013457431",
    appId: "1:13013457431:web:9c2a470f569721b1cf9a52"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- 🛡️ User Session Protection ---
const partnerEmail = localStorage.getItem('userEmail');
const userRole = localStorage.getItem('userRole');

// Role 'partner' ছোট হাতের কি না তা চেক করুন (Database value matching)
if (!partnerEmail || userRole !== 'partner') {
    console.log("No valid session found. Redirecting to login...");
    window.location.replace('index.html');
}

// --- 1. Load Stats (Dashboard) ---
function loadDashboardStats() {
    if(!partnerEmail) return;
    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail));
    onSnapshot(q, (snap) => {
        let total = snap.size;
        let pending = 0;
        let totalComm = 0;

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') pending++;
            // Assuming commStatus might be updated by admin later
            if (data.commStatus === 'paid') totalComm += (data.commission || 0);
        });

        const statTotal = document.getElementById('statTotalStudents');
        const statActive = document.getElementById('statActiveFiles');
        const statEarn = document.getElementById('statEarnings');
        const wallBal = document.getElementById('walletBalance');

        if(statTotal) statTotal.innerText = total;
        if(statActive) statActive.innerText = pending;
        if(statEarn) statEarn.innerText = "৳ " + (totalComm * 120).toLocaleString();
        if(wallBal) wallBal.innerText = "৳ " + (totalComm * 120).toLocaleString();
    });
}

// --- 2. Smart Assessment (Search & Filter) ---
function initSearch() {
    const fCountry = document.getElementById('fCountry');
    const fDegree = document.getElementById('fDegree');
    const fLang = document.getElementById('fLangType');

    if(!fCountry) return; // Guard for other pages

    onSnapshot(collection(db, "universities"), (snap) => {
        const allUnis = [];
        snap.forEach(doc => allUnis.push({ id: doc.id, ...doc.data() }));

        const filterData = () => {
            const countryVal = fCountry.value.toLowerCase();
            const degreeVal = fDegree.value;
            const langVal = fLang.value.toLowerCase();

            const filtered = allUnis.filter(u => {
                const uCountry = u.country ? u.country.toLowerCase() : "";
                const uLang = u.ieltsReq ? u.ieltsReq.toLowerCase() : "";
                
                return (uCountry.includes(countryVal)) &&
                       (degreeVal === "" || u.degree === degreeVal) &&
                       (langVal === "" || uLang.includes(langVal));
            });

            renderUnis(filtered);
        };

        fCountry.oninput = filterData;
        fDegree.onchange = filterData;
        fLang.onchange = filterData;

        filterData(); 
    });
}

function renderUnis(unis) {
    const container = document.getElementById('assessmentResults');
    const mCount = document.getElementById('matchCount');
    if(!container) return;

    if(mCount) mCount.innerText = `${unis.length} Universities Found`;
    
    container.innerHTML = unis.map(u => `
        <tr>
            <td><b>${u.universityName}</b><br><small>Rank: #${u.rank || 'N/A'}</small></td>
            <td>${u.country}</td>
            <td><span class="badge">${u.degree}</span><br><small>${u.ieltsReq || 'No Req'}</small></td>
            <td>$${u.semesterFee || 0}</td>
            <td style="color:#2ecc71; font-weight:bold;">${u.partnerComm || 0}%</td>
            <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}', '${u.id}', ${u.partnerComm || 0}, ${u.semesterFee || 0})">Apply</button></td>
        </tr>
    `).join('');
}

// --- 3. Application Submission ---
window.openApplyModal = (name, id, comm, fee) => {
    document.getElementById('targetUni').innerText = name;
    document.getElementById('sUni').value = name;
    document.getElementById('studentFormModal').style.display = 'flex';
    window.currentAppData = { uniId: id, commPct: comm, fee: fee };
};

const submitBtn = document.getElementById('submitAppBtn');
if(submitBtn) {
    submitBtn.onclick = async () => {
        const sName = document.getElementById('sName').value;
        const sPass = document.getElementById('sPass').value;
        
        if(!sName || !sPass) return alert("Please fill mandatory fields!");

        try {
            submitBtn.innerText = "Uploading Documents...";
            submitBtn.disabled = true;

            const files = {
                passport: document.getElementById('filePassport').files[0],
                academic: document.getElementById('fileAcademic').files[0]
            };

            let urls = {};
            for (let key in files) {
                if (files[key]) {
                    const storageRef = ref(storage, `docs/${Date.now()}_${files[key].name}`);
                    const uploadSnap = await uploadBytes(storageRef, files[key]);
                    urls[key] = await getDownloadURL(uploadSnap.ref);
                }
            }

            const appData = {
                studentName: sName,
                passportNo: sPass,
                phone: document.getElementById('sPhone').value || "",
                university: document.getElementById('sUni').value,
                commission: (window.currentAppData.fee * window.currentAppData.commPct) / 100,
                partnerEmail: partnerEmail,
                partnerName: localStorage.getItem('partnerName') || "Partner",
                status: 'pending',
                docs: urls,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "applications"), appData);
            
            window.showSuccessSlip({
                id: docRef.id,
                studentName: sName,
                university: appData.university
            });

        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            submitBtn.innerText = "Confirm & Submit";
            submitBtn.disabled = false;
        }
    };
}

// --- 4. Tracking Table ---
function loadTracking() {
    if(!partnerEmail) return;
    const trackingCont = document.getElementById('trackingBody');
    if(!trackingCont) return;

    const q = query(collection(db, "applications"), where("partnerEmail", "==", partnerEmail), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let html = "";
        snap.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate().toLocaleDateString() || "Just now";
            html += `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.passportNo}</td>
                    <td>${data.university}</td>
                    <td><span class="badge" style="background:orange; color:black;">${data.status}</span></td>
                    <td><a href="${data.docs?.passport || '#'}" target="_blank" style="color:white;"><i class="fa-solid fa-file-pdf"></i> View</a></td>
                    <td>${date}</td>
                </tr>
            `;
        });
        trackingCont.innerHTML = html;
    });
}

// Initialize Everything
loadDashboardStats();
initSearch();
loadTracking();
