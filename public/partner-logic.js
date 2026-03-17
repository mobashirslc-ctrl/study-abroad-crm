import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk",
  authDomain: "ihp-portal-v3.firebaseapp.com",
  projectId: "ihp-portal-v3",
  storageBucket: "ihp-portal-v3.firebasestorage.app",
  messagingSenderId: "481157902534",
  appId: "1:481157902534:web:2d9784032fbf0f2f7fe7c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchUniversities() {
    const uniTable = document.getElementById('assessmentResults');
    if(!uniTable) return;

    try {
        // কালেকশন নাম 'universities' চেক করুন, না হলে আপনার ডাটাবেজে যা আছে তা দিন
        const querySnapshot = await getDocs(collection(db, "universities")); 
        uniTable.innerHTML = ""; 

        if (querySnapshot.empty) {
            uniTable.innerHTML = "<tr><td colspan='11' style='text-align:center;'>কোনো ডেটা পাওয়া যায়নি। কালেকশন নাম চেক করুন।</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const d = doc.data();
            
            // সব ধরণের সম্ভাব্য ফিল্ড নাম চেক করা হচ্ছে (Case-Insensitive Match)
            const name = d.uniName || d.name || d.universityName || d["Uni Name"] || "Unknown";
            const country = d.country || d.Country || "N/A";
            const course = d.course || d.Course || d.courseName || "N/A";
            const fee = parseFloat(d.semesterFee || d.fee || d.TuitionFee || 0);
            const comm = parseFloat(d.partnerComm || d.commission || d.Commission || 0);

            const bdtRate = 120; 
            const bdtTotal = fee * bdtRate;
            const myComm = (bdtTotal * comm) / 100;

            const row = `
                <tr>
                    <td><b>${name}</b></td>
                    <td>${country}</td>
                    <td>${course}</td>
                    <td>${d.intake || 'N/A'}</td>
                    <td>${d.duration || 'N/A'}</td>
                    <td>$${fee}</td>
                    <td>USD</td>
                    <td>৳ ${bdtTotal.toLocaleString()}</td>
                    <td>${comm}%</td>
                    <td style="color: #2ecc71; font-weight: bold;">৳ ${myComm.toLocaleString()}</td>
                    <td><button class="btn-gold" onclick="openApplyModal('${name}')">Apply</button></td>
                </tr>
            `;
            uniTable.innerHTML += row;
        });
    } catch (error) {
        console.error("Error:", error);
        uniTable.innerHTML = `<tr><td colspan='11' style='color:red;'>Error: ${error.message}</td></tr>`;
    }
}

// গ্লোবাল উইন্ডোতে ফাংশন সেট করা
window.openApplyModal = (n) => {
    document.getElementById('sUni').value = n;
    document.getElementById('studentFormModal').style.display = 'flex';
};

// পেজ লোড হলে কল হবে
fetchUniversities();
   
