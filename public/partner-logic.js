import { db, auth } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ১. অথেনটিকেশন এবং ব্ল্যাঙ্ক স্ক্রিন ফিক্স
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');
    if (user) {
        // লগইন করা থাকলে লোডার সরিয়ে ড্যাশবোর্ড দেখাবে
        if (loader) loader.style.display = 'none';
        document.body.classList.add('auth-ready');
        console.log("Welcome:", user.email);
    } else {
        window.location.href = "index.html"; 
    }
});

// ২. লগআউট
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html"; 
        });
    });
}

// ৩. ইউনিভার্সিটি সার্চ (Database Field Fix)
const runSearchBtn = document.getElementById('runSearchBtn');
if (runSearchBtn) {
    runSearchBtn.addEventListener('click', async () => {
        const countryInput = document.getElementById('fCountry').value.trim();
        const resultsBody = document.getElementById('uniResultsBody');
        const resArea = document.getElementById('resArea');

        if (!countryInput) {
            alert("Type country name (e.g., United kingdom)");
            return;
        }

        resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Searching...</td></tr>";
        resArea.style.display = 'block';

        try {
            const q = query(collection(db, "universities"), where("country", "==", countryInput));
            const querySnapshot = await getDocs(q);

            resultsBody.innerHTML = "";
            if (querySnapshot.empty) {
                resultsBody.innerHTML = `<tr><td colspan='5' style='text-align:center;'>No data for "${countryInput}". Check spelling (e.g. United kingdom)</td></tr>`;
                return;
            }

            querySnapshot.forEach((doc) => {
                const uni = doc.data();
                resultsBody.innerHTML += `
                    <tr>
                        <td>${uni.universityName || 'N/A'}</td>
                        <td>${uni.country || 'N/A'}</td>
                        <td>${uni.degree || 'N/A'}</td>
                        <td style="color:var(--gold); font-weight:bold;">${uni.partnerComm || '0'}%</td>
                        <td><button class="btn-gold" onclick="alert('Applying for ${uni.universityName}')">Apply</button></td>
                    </tr>`;
            });
        } catch (error) {
            console.error("Search error:", error);
            alert("Error loading data.");
        }
    });
}