import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ইউনিভার্সিটি সেভ করার ফাংশন
document.getElementById('saveUniBtn').onclick = async () => {
    const btn = document.getElementById('saveUniBtn');
    btn.innerText = "Saving...";
    btn.disabled = true;

    const uniData = {
        universityName: document.getElementById('uName').value,
        country: document.getElementById('uCountry').value,
        courseName: document.getElementById('uCourse').value,
        degreeType: document.getElementById('uDegree').value,
        semesterFee: parseFloat(document.getElementById('uSemesterFee').value) || 0,
        partnerComm: parseFloat(document.getElementById('uPartnerComm').value) || 0,
        minGPA: parseFloat(document.getElementById('uMinGPA').value) || 0,
        ieltsO: document.getElementById('uIeltsO').value,
        gapAcceptance: document.getElementById('uGap').value,
        intake: document.getElementById('uIntake').value,
        scholarship: document.getElementById('uScholarship').value,
        status: document.getElementById('uStatus').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "universities"), uniData);
        alert("University Added Successfully!");
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Save University";
    }
};

// অ্যাডমিন টেবিল শো করার ফাংশন (Optional but useful)
async function loadAdminTable() {
    const snap = await getDocs(collection(db, "universities"));
    let html = "";
    snap.forEach(doc => {
        const u = doc.data();
        html += `<tr>
            <td>${u.universityName}</td>
            <td>${u.country}</td>
            <td>${u.courseName}</td>
            <td>GPA: ${u.minGPA}</td>
            <td><button style="color:red" onclick="deleteUni('${doc.id}')">Delete</button></td>
        </tr>`;
    });
    document.getElementById('uniTableBody').innerHTML = html;
}
loadAdminTable();