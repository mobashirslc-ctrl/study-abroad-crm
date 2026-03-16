import { db, auth } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ১. লগআউট এবং অথেনটিকেশন চেক (Logout Fix)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html"; // লগআউট হলে হোম পেজে পাঠাবে
    }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html"; 
        });
    });
}

// ২. ইউনিভার্সিটি সার্চ লজিক (Search Fix)
const runSearchBtn = document.getElementById('runSearchBtn');
if (runSearchBtn) {
    runSearchBtn.addEventListener('click', async () => {
        const countryInput = document.getElementById('fCountry').value.trim();
        const resultsBody = document.getElementById('uniResultsBody');
        const resArea = document.getElementById('resArea');

        if (!countryInput) {
            alert("Please type a country name (e.g., United kingdom)");
            return;
        }

        resultsBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Searching...</td></tr>";
        resArea.style.display = 'block';

        try {
            // আপনার ডাটাবেজের 'universities' কালেকশনে সার্চ করবে
            const q = query(collection(db, "universities"), where("country", "==", countryInput));
            const querySnapshot = await getDocs(q);

            resultsBody.innerHTML = "";
            if (querySnapshot.empty) {
                resultsBody.innerHTML = `<tr><td colspan='5' style='text-align:center;'>No results for "${countryInput}". (Note: Check for spelling, e.g., "United kingdom")</td></tr>`;
                return;
            }

            querySnapshot.forEach((doc) => {
                const uni = doc.data();
                // আপনার ডাটাবেজের ফিল্ড নামের সাথে মিলিয়ে ডাটা দেখাচ্ছে
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
            alert("Error fetching data. Check Console.");
        }
    });
}