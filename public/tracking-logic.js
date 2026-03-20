import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDonKHMydghjn3nAwjtsvQFDyT-70DGqOk", 
    authDomain: "ihp-portal-v3.firebaseapp.com", 
    projectId: "ihp-portal-v3", 
    storageBucket: "ihp-portal-v3.firebasestorage.app", 
    messagingSenderId: "481157902534", 
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let unsubscribe = null;
const passportInput = document.getElementById('passportInput');
const resultDiv = document.getElementById('result');
const dataContent = document.getElementById('data-content');
const loadingDiv = document.getElementById('loading');

// Auto-Clear logic when input is removed
passportInput.addEventListener('input', () => {
    if (passportInput.value.trim() === "") {
        if (unsubscribe) unsubscribe();
        resultDiv.style.display = "none";
        loadingDiv.style.display = "none"; // Hide loading too
        dataContent.innerHTML = "";
    }
});

document.getElementById('trackBtn').addEventListener('click', () => {
    const inputVal = passportInput.value.trim();
    if (!inputVal) { alert("Please enter a Passport Number!"); return; }

    if (unsubscribe) unsubscribe();

    // Show loading indicator
    loadingDiv.style.display = "block";
    resultDiv.style.display = "none"; // Hide previous results while loading

    const q = query(
        collection(db, "applications"), 
        where("passportNo", "==", inputVal),
        orderBy("createdAt", "desc"), // Needs the index from 1083.jpg
        limit(1)
    );
    
    unsubscribe = onSnapshot(q, (snap) => {
        // Hide loading indicator regardless of the result
        loadingDiv.style.display = "none";

        if (snap.empty) {
            alert("❌ No Record Found.");
            resultDiv.style.display = "none";
        } else {
            resultDiv.style.display = "block";
            snap.forEach(doc => {
                const d = doc.data();
                const rawStatus = (d.status || 'PENDING').toUpperCase();

                let timeAgo = "Just Now";
                if (d.createdAt) {
                    const diffMins = Math.floor((new Date() - d.createdAt.toDate()) / 60000);
                    timeAgo = diffMins < 1 ? "Just Now" : `${diffMins} mins ago`;
                }

                let estimateText = "Our team is processing your file.";
                if (rawStatus.includes("PENDING")) estimateText = "Initial screening: Expect update in 24-48 hours.";
                else if (rawStatus.includes("APPLIED")) estimateText = "University review: Offer letter takes 7-14 working days.";
                else if (rawStatus.includes("OFFER")) estimateText = "Payment/CAS verification: 5-7 working days.";
                else if (rawStatus.includes("VISA")) estimateText = "Embassy processing: Results usually in 15-21 days.";

                dataContent.innerHTML = `
                    <div class="info-row"><span class="label">Student Name:</span> <span class="val">${d.studentName || 'N/A'}</span></div>
                    <div class="info-row"><span class="label">Passport No:</span> <span class="val">${d.passportNo}</span></div>
                    <div class="status-box">
                        <div style="font-size:10px; opacity:0.7;">CURRENT STATUS</div>
                        <div style="font-size:18px; font-weight:bold; color:#2ecc71;">${rawStatus}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.6);">⏱ ${timeAgo}</div>
                    </div>
                    <div class="estimate-box">
                        <div style="font-size:11px; font-weight:bold; color:#f1c40f;">📅 EXPECTED NEXT STEP</div>
                        <div style="font-size:13px;">${estimateText}</div>
                    </div>
                    <div style="font-size:11px; color: rgba(255,255,255,0.5); margin-top:15px;">Your application is handled at our central hub.</div>
                `;
            });
        }
    }, (error) => {
        // Handle potential errors like missing indexes
        loadingDiv.style.display = "none";
        console.error("Firebase Error:", error);
        alert("A technical issue occurred. Please try again later.");
    });
});
