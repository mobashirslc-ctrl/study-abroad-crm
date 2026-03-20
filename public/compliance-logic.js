import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const staffEmail = localStorage.getItem('userEmail');

// --- লোডার এবং ওভারলে সরানোর ফাংশন ---
const hideLoader = () => {
    const loader = document.getElementById('loader'); 
    const overlay = document.querySelector('.securing-session-overlay'); 
    if(loader) loader.style.display = 'none';
    if(overlay) overlay.style.display = 'none';
};

if (!staffEmail) { 
    window.location.href = 'index.html'; 
}

// --- ১. স্টাফের নাম লোড ও সেশন চেক (Fixed: Name Fetching) ---
async function displayStaffName() {
    const displayElement = document.getElementById('staffDisplay');
    if (!staffEmail) return;

    try {
        // লজিক ১: সরাসরি ইমেইল আইডি দিয়ে ডকুমেন্ট চেক করা
        onSnapshot(doc(db, "users", staffEmail.toLowerCase()), (d) => {
            if (d.exists()) {
                const userData = d.data();
                if (displayElement) displayElement.innerText = userData.fullName || userData.name || staffEmail;
                hideLoader();
            } else {
                // লজিক ২: যদি ইমেইল আইডি না হয়ে ডকুমেন্টের ভেতরে ফিল্ড থাকে
                const q = query(collection(db, "users"), where("email", "==", staffEmail.toLowerCase()));
                onSnapshot(q, (snap) => {
                    if (!snap.empty) {
                        const userData = snap.docs[0].data();
                        if (displayElement) displayElement.innerText = userData.fullName || userData.name || staffEmail;
                    } else {
                        // যদি কোনোভাবেই নাম না পাওয়া যায়, তবে ইমেইল থেকে নাম বানানো
                        if (displayElement) displayElement.innerText = staffEmail.split('@')[0].toUpperCase();
                    }
                    hideLoader();
                });
            }
        }, (error) => {
            console.error("Name Fetch Error:", error);
            hideLoader();
        });
    } catch (e) {
        hideLoader();
    }
}
displayStaffName();

// --- ২. স্লাইডার ও ফাইল লকিং লজিক ---
window.openReview = async (id, sName) => {
    window.currentAppId = id; 
    const slider = document.getElementById('reviewSlider');
    const nameDisplay = document.getElementById('targetStudent');
    const docArea = document.getElementById('docLinksArea');
    const updateBtn = document.getElementById('updateStatusBtn');

    if (nameDisplay) nameDisplay.innerText = sName;
    if (slider) slider.classList.add('active');

    try {
        const appRef = doc(db, "applications", id);
        const snap = await getDoc(appRef);
        if (snap.exists()) {
            const d = snap.data();
            const docs = d.docs || {};

            // লকিং চেক
            if (d.handledBy && d.handledBy !== staffEmail) {
                updateBtn.disabled = true;
                updateBtn.innerText = `LOCKED BY: ${d.handledBy.split('@')[0].toUpperCase()}`;
                updateBtn.style.background = "#bdc3c7"; 
            } else {
                updateBtn.disabled = false;
                updateBtn.innerText = "UPDATE STATUS & SYNC";
                updateBtn.style.background = ""; 
                // প্রথমবার ফাইল ওপেন করলে নিজের নামে লক করা
                if (!d.handledBy) await updateDoc(appRef, { handledBy: staffEmail });
            }

            // ডকুমেন্ট লিঙ্ক দেখানো
            if (docArea) {
                docArea.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                        ${docs.academic ? `<a href="${docs.academic}" target="_blank" style="background:#f1c40f; color:#000; padding:10px; text-align:center; text-decoration:none; border-radius:5px; font-weight:bold; font-size:12px;">Academic PDF</a>` : ''}
                        ${docs.passport ? `<a href="${docs.passport}" target="_blank" style="background:#f1c40f; color:#000; padding:10px; text-align:center; text-decoration:none; border-radius:5px; font-weight:bold; font-size:12px;">Passport PDF</a>` : ''}
                        ${docs.others ? `<a href="${docs.others}" target="_blank" style="background:#f1c40f; color:#000; padding:10px; text-align:center; text-decoration:none; border-radius:5px; font-weight:bold; font-size:12px;">Other Docs</a>` : ''}
                    </div>`;
                if (!docs.academic && !docs.passport) {
                    docArea.innerHTML = "<p style='color:#888; text-align:center;'>No documents found.</p>";
                }
            }
        }
    } catch (e) { console.error("Slider Error:", e); }
};

window.closeSlider = () => { document.getElementById('reviewSlider').classList.remove('active'); };

// --- ৩. টেবিল লোড (Realtime) ---
onSnapshot(query(collection(db, "applications"), orderBy("createdAt", "desc")), (snap) => {
    const tbody = document.getElementById('incomingTableBody');
    if (!tbody) return;
    let html = "";
    snap.forEach(dSnap => {
        const d = dSnap.data();
        const isLocked = d.handledBy && d.handledBy !== staffEmail;
        
        html += `
            <tr style="${isLocked ? 'opacity: 0.7;' : ''}">
                <td><b>${d.studentName}</b><br><small style="color:#888;">${d.partnerEmail}</small></td>
                <td>${d.passportNo || 'N/A'}</td>
                <td><span class="status-pill ${d.status}">${(d.status || "pending").toUpperCase()}</span></td>
                <td><small style="font-weight:bold; color:${isLocked ? '#e74c3c' : '#2ecc71'};">
                    ${d.handledBy ? d.handledBy.split('@')[0].toUpperCase() : 'WAITING'}
                </small></td>
                <td>
                    <button class="btn-claim" onclick="openReview('${dSnap.id}', '${d.studentName}')" 
                        style="${isLocked ? 'background:#bdc3c7;' : ''}" ${isLocked ? 'disabled' : ''}>
                        ${isLocked ? 'LOCKED' : 'REVIEW'}
                    </button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
    hideLoader(); // টেবিল লোড হয়ে গেলে লোডার রিমুভ নিশ্চিত করা
});

// --- ৪. স্ট্যাটাস আপডেট লজিক (Sync with Partner Wallet) ---
const updateBtn = document.getElementById('updateStatusBtn');
if (updateBtn) {
    updateBtn.onclick = async () => {
        const newStatus = document.getElementById('statusSelect').value;
        const appId = window.currentAppId;

        if (!appId) return alert("Select an application first!");

        updateBtn.innerText = "Syncing...";
        updateBtn.disabled = true;

        try {
            await updateDoc(doc(db, "applications", appId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                handledBy: staffEmail 
            });
            alert(`Application updated to ${newStatus.toUpperCase()}`);
            closeSlider();
        } catch (e) {
            alert("Update Error: " + e.message);
        } finally {
            updateBtn.innerText = "UPDATE STATUS & SYNC";
            updateBtn.disabled = false;
        }
    };
}

// --- ৫. লগআউট ---
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = () => {
        if(confirm("Logout from Staff Session?")) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    };
}
