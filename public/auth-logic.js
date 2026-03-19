import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. আপনার পাঠানো Firebase Configuration (Verified)
const firebaseConfig = {
    apiKey: "AIzaSyDonKHMy dghjn3nAwjtsvQFDyT-78DGqOk",
    authDomain: "ihp-portal-v3.firebaseapp.com",
    projectId: "ihp-portal-v3",
    storageBucket: "ihp-portal-v3.firebasestorage.app",
    messagingSenderId: "481157902534",
    appId: "1:481157902534:web:2d9784032fbf8f2f7fe7c7",
    measurementId: "G-P9S5BHTY6F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ২. রেজিস্ট্রেশন ফাংশন (Step 1.3, 1.4 & 1.5 এর জন্য)
async function handleRegister() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('userRole').value;

    if (!role) return alert("দয়া করে Partner অথবা Compliance সিলেক্ট করুন।");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        let userData = {
            uid: user.uid,
            email: email,
            role: role,
            isApproved: false, // Step 1.6: ডিফল্টভাবে অনুমোদন বন্ধ থাকবে
            createdAt: new Date().toISOString()
        };

        // রোল অনুযায়ী ডাটা ক্যাটাগরি সেট করা
        if (role === 'Partner') {
            userData.agencyName = document.getElementById('pAgency').value;
            userData.authorizedPerson = document.getElementById('pPerson').value;
            userData.contact = document.getElementById('pContact').value;
            userData.address = document.getElementById('pAddress').value;
            userData.serviceCountries = document.getElementById('pService').value;
            // PDF ফাইলের লিঙ্কগুলো এখানে যোগ হবে (Cloudinary implementation-এর পর)
        } else if (role === 'Compliance') {
            userData.employeeName = document.getElementById('cName').value;
            userData.organisation = document.getElementById('cOrg').value;
            userData.experience = document.getElementById('cExp').value;
            userData.assignedCountries = document.getElementById('cService').value;
        }

        await setDoc(doc(db, "users", user.uid), userData);
        alert("রেজিস্ট্রেশন সফল! অ্যাডমিন অনুমোদন না দেওয়া পর্যন্ত অপেক্ষা করুন।");
        location.reload();

    } catch (error) {
        alert("ভুল হয়েছে: " + error.message);
    }
}

// ৩. লগইন ফাংশন (Step 1.6: Admin Approval Check)
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // ডাটাবেজ থেকে চেক করা অ্যাপ্রুভাল আছে কি না
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();

            if (!data.isApproved) {
                alert("আপনার অ্যাকাউন্ট এখনো অ্যাডমিন দ্বারা অনুমোদিত নয়।");
                await signOut(auth);
                return;
            }

            // সেশন ডাটা সেভ করা
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userName', data.agencyName || data.employeeName);

            // রোল অনুযায়ী ড্যাশবোর্ডে রিডিরেক্ট
            if (data.role === 'Partner') {
                window.location.href = "partner.html";
            } else if (data.role === 'Compliance') {
                window.location.href = "compliance.html";
            }
        }
    } catch (error) {
        alert("লগইন ব্যর্থ: " + error.message);
    }
}

// বাটনগুলোর সাথে ইভেন্ট কানেক্ট করা
document.getElementById('regBtn')?.addEventListener('click', handleRegister);
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
