import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { /* আপনার কনফিগ এখানে */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userEmail = localStorage.getItem('userEmail');

let allUnis = [];

// ইউনিভার্সিটি লোড করা
onSnapshot(collection(db, "universities"), (snap) => {
    allUnis = snap.docs.map(d => d.data());
});

// স্মার্ট সার্চ
document.getElementById('searchBtn').onclick = () => {
    const country = document.getElementById('fCountry').value.toLowerCase();
    const gpa = parseFloat(document.getElementById('fGPA').value) || 0;
    const lang = parseFloat(document.getElementById('fLang').value) || 0;

    const filtered = allUnis.filter(u => 
        (country === "" || u.country.toLowerCase().includes(country)) &&
        (gpa >= (parseFloat(u.minGPA) || 0)) &&
        (lang >= (parseFloat(u.minLangScore) || 0))
    );

    const container = document.getElementById('uniListContainer');
    document.getElementById('searchResultArea').style.display = 'block';

    if(filtered.length > 0) {
        container.innerHTML = filtered.map(u => `
            <tr>
                <td><b>${u.universityName}</b></td>
                <td>$${u.semesterFee}</td>
                <td style="color:var(--gold)">৳${u.partnerComm}</td>
                <td><button class="btn-gold" onclick="openApply('${u.universityName}', '${u.partnerComm}')">Apply</button></td>
            </tr>`).join('');
    } else {
        container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Not Qualified for any University</td></tr>`;
    }
};

// ফাইল প্রিভিউ ফিক্স লজিক (The Key Fix)
function getDocViewLink(url) {
    if (!url || url === "#") return "#";
    // যদি ইমেজ হয় সরাসরি ওপেন করবে, পিডিএফ হলে গুগল ভিউয়ার ইউজ করবে
    if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        return url; 
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

// ট্র্যাকিং ও টেবিল আপডেট
function initTracking() {
    const q = query(collection(db, "applications"), where("partnerEmail", "==", userEmail));
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById('trackingList');
        tbody.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const viewLink = getDocViewLink(d.docs?.academic);
            return `
            <tr>
                <td>${d.studentName}</td>
                <td>${d.passportNo}</td>
                <td>${d.university}</td>
                <td><span class="status-badge" style="background:orange">${d.status}</span></td>
                <td><a href="${viewLink}" target="_blank" style="color:var(--gold)">View Document</a></td>
            </tr>`;
        }).join('');
    });
}

// বাকী সাবমিশন ও পপআপ লজিক আপনার আগের কোড থেকে এখানে যোগ করবেন (যেমন uploadToCloudinary)।
window.openApply = (name, comm) => {
    document.getElementById('modalUniName').innerText = name;
    document.getElementById('applyModal').style.display = 'flex';
    window.selectedApp = { name, comm };
};

initTracking();
