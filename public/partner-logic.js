import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config (আপনার কনফিগ ঠিক আছে)
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
const partnerEmail = (localStorage.getItem('partnerEmail') || '').toLowerCase().trim();

// ৩. সার্চ লজিক ফিক্স (Degree mismatch solution)
export async function searchUni() {
    const countryInput = document.getElementById('fCountry').value.toLowerCase().trim();
    const degreeInput = document.getElementById('fDegree').value; // Dropdown value
    const container = document.getElementById('uniListContainer');
    
    container.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Searching Universities...</td></tr>";

    try {
        const snap = await getDocs(collection(db, "universities"));
        let html = "";
        let found = false;

        snap.forEach(docSnap => {
            const u = docSnap.data();
            
            // ফিল্টারিং লজিক: কান্ট্রি এবং ডিগ্রি উভয়ই চেক করবে
            // ডিগ্রি যদি সিলেক্ট করা থাকে তবেই কেবল সেটি দিয়ে ফিল্টার করবে
            const matchCountry = !countryInput || u.country.toLowerCase().includes(countryInput);
            const matchDegree = !degreeInput || (u.degree && u.degree.trim() === degreeInput.trim());

            if (matchCountry && matchDegree) {
                found = true;
                html += `
                <tr>
                    <td><b>${u.universityName}</b><br><small>${u.country}</small></td>
                    <td>${u.degree}</td>
                    <td>${u.minGPA}</td>
                    <td>৳${(u.semesterFee * 120).toLocaleString()}</td>
                    <td style="color:#f1c40f">৳${(u.semesterFee * 120 * (u.partnerComm || 0) / 100).toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${u.universityName}')">APPLY</button></td>
                </tr>`;
            }
        });

        container.innerHTML = found ? html : "<tr><td colspan='6' style='text-align:center; color:orange;'>No exact match found for this degree/country.</td></tr>";
    } catch (e) {
        console.error("Search Error:", e);
        container.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Connection Error! Check Console.</td></tr>";
    }
}

// ৪. সাবমিশন লজিক (Compliance Staff প্যানেলে ডাটা পাঠানোর জন্য)
export async function submitApplication() {
    const sName = document.getElementById('sName').value;
    const sPass = document.getElementById('sPassport').value;
    
    if(!sName || !sPass) return alert("Please enter Student Name and Passport!");

    try {
        // নতুন ফাইল যখন সাবমিট হবে, তখন 'status' দিতে হবে যা Compliance Staff দেখতে পায়
        await addDoc(collection(db, "applications"), {
            studentName: sName,
            passportNo: sPass,
            university: currentUni, // global variable from openApplyModal
            partnerEmail: partnerEmail,
            status: "Pending Assessment", // এই স্ট্যাটাসটি গুরুত্বপূর্ণ
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            handledBy: "Waiting for Staff" 
        });

        alert("Application Submitted Successfully! It will now appear in Compliance Panel.");
        closeModal();
    } catch (e) {
        console.error("Submit Error:", e);
        alert("Submission failed. Check internet connection.");
    }
}

// বাকি ফাংশনগুলো আগের মতোই থাকবে (initRealtimeData, initTracking, ইত্যাদি)
export { initRealtimeData, initTracking, openApplyModal, closeModal, requestWithdraw, updateProfile };