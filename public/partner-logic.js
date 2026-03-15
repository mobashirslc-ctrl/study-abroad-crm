import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// ১. সিকিউরিটি চেক (এডমিন এপ্রুভাল ও লুপ প্রোটেকশন)
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // লগইন না থাকলে ইনডেক্স পেজে পাঠাবে
        if (!window.location.pathname.includes("index.html") && window.location.pathname !== "/") {
            window.location.replace("index.html");
        }
    } else {
        // লগইন থাকলেও চেক করবে সে এপ্রুভড কি না
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().status !== "approved") {
            await signOut(auth);
            window.location.replace("index.html");
        }
    }
});

// ২. ড্যাশবোর্ড ট্যাব ফাংশন
window.tab = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    // ট্যাব ক্লিক করলে হাইলাইট করার জন্য (যদি এলিমেন্টটি ইভেন্ট থেকে আসে)
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

// ৩. অ্যাপ্লিকেশন সাবমিশন লজিক
let curUni = "";
window.openApp = (u) => {
    curUni = u;
    document.getElementById('mTitle').innerText = u;
    document.getElementById('appModal').style.display = 'flex';
};

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.onclick = async () => {
        const name = document.getElementById('sName').value;
        const pass = document.getElementById('sPass').value;
        if (!name || !pass) return alert("All fields are required!");

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";
            
            await addDoc(collection(db, "applications"), {
                studentName: name,
                passport: pass,
                university: curUni,
                status: "Pending",
                partner: "GORUN LTD.", // আপনি চাইলে ইউজারের নাম Firestore থেকে নিয়ে এখানে দিতে পারেন
                timestamp: new Date().toISOString()
            });

            alert("Application submitted successfully!");
            document.getElementById('appModal').style.display = 'none';
            // ইনপুট ফিল্ড ক্লিয়ার করা
            document.getElementById('sName').value = "";
            document.getElementById('sPass').value = "";
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Now";
        }
    };
}

// ৪. রিয়েল-টাইম ডাটা লোড (ড্যাশবোর্ড ও ট্র্যাকিং টেবিলের জন্য)
onSnapshot(query(collection(db, "applications"), orderBy("timestamp", "desc")), (snap) => {
    let r = "";
    snap.forEach(doc => {
        const d = doc.data();
        r += `
            <tr class="border-b border-gray-700 hover:bg-white/5 transition">
                <td class="p-4">${d.studentName}</td>
                <td class="p-4">${d.passport}</td>
                <td class="p-4">${d.university}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-bold ${d.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}">
                        ${d.status}
                    </span>
                </td>
                <td class="p-4">${new Date(d.timestamp).toLocaleDateString()}</td>
            </tr>`;
    });
    
    // ড্যাশবোর্ড এবং ট্র্যাকিং দুই জায়গার টেবিল বডি আপডেট করবে
    document.querySelectorAll('.sharedBody').forEach(t => {
        t.innerHTML = r || '<tr><td colspan="5" class="p-4 text-center">No applications found.</td></tr>';
    });
});

// ৫. লগআউট লজিক
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        signOut(auth).then(() => {
            window.location.replace("index.html");
        }).catch((error) => {
            alert("Logout failed: " + error.message);
        });
    };
}