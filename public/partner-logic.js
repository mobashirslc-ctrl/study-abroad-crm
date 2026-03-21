import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

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
const userEmail = localStorage.getItem('userEmail'); 

if (!userEmail) { window.location.href = 'index.html'; } 

// --- ১. লাইভ ট্র্যাকিং লজিক (Index Lock Bypass করার জন্য orderBy সরানো হয়েছে) ---
const syncDashboard = () => {
    // শুধুমাত্র partnerEmail দিয়ে কুয়েরি করা হচ্ছে যাতে ইন্ডেক্স ইরর না আসে
    const q = query(
        collection(db, "applications"), 
        where("partnerEmail", "==", userEmail.toLowerCase())
    );
    
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        let docsArray = [];

        snap.forEach(dSnap => {
            const d = dSnap.data();
            docsArray.push(d); // ম্যানুয়াল সর্টিং এর জন্য অ্যারেতে রাখা হচ্ছে
            
            const comm = Number(d.commission || 0);
            const status = (d.status || "submitted").toLowerCase();

            if (status !== 'visa rejected') {
                if (status === 'student paid to uni') final += comm;
                else if (status === 'verified') pending += comm;
            }
        }); 

        // কোডের মাধ্যমে সর্টিং করা হচ্ছে (নতুনগুলো উপরে থাকবে)
        docsArray.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docsArray.forEach(d => {
            const status = (d.status || "submitted").toLowerCase();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : '...';

            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status}">${status.toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody'); 
        
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
};
syncDashboard(); 

// --- ২. ফাইল আপলোড লজিক (Null/Undefined Error Fix) ---
const uploadFile = async (file) => {
    if (!file) return "No File"; // ফাইল না থাকলে স্ট্রিং রিটার্ন করবে
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "No File";
    } catch (err) { return "No File"; }
}; 

// --- ৩. অ্যাপ্লিকেশন সাবমিট ও ডিজাইনড স্লিপ ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 
    
    if(!sName || !sPass) return alert("Fill Name and Passport!");
    
    btn.innerText = "Processing..."; btn.disabled = true; 

    try {
        const acadInput = document.getElementById('fileAcad');
        const passInput = document.getElementById('filePass');

        // ফাইল সিলেক্ট করা হয়েছে কিনা চেক করা হচ্ছে
        const acadUrl = (acadInput.files.length > 0) ? await uploadFile(acadInput.files[0]) : "No File";
        const passUrl = (passInput.files.length > 0) ? await uploadFile(passInput.files[0]) : "No File"; 

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: window.selectedUni ? window.selectedUni.name : "N/A",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        await addDoc(collection(db, "applications"), appData);
        
        // --- PREMIUM SLIP GENERATION ---
        const slipWin = window.open('', '_blank');
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const refNo = `SCC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        slipWin.document.write(`
            <html><head><title>Slip - ${sName}</title>
            <style>
                body { font-family: sans-serif; background: #f0f0f0; padding: 20px; }
                .card { background: white; max-width: 800px; margin: auto; border-bottom: 8px solid #2b0054; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .top { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #00a651; }
                .logo { flex: 1; display: flex; align-items: center; gap: 10px; }
                .ref { text-align: right; font-size: 12px; }
                .head { background: #eee; padding: 8px; font-weight: bold; margin: 15px 0; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; padding: 0 20px; gap: 10px; font-size: 14px; }
                .status { text-align: center; border: 2px dashed #00a651; padding: 15px; margin: 20px; border-radius: 10px; }
                .badge { background: #00a651; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                @media print { .no-print { display: none; } }
            </style></head><body>
                <div class="card">
                    <div class="top">
                        <div class="logo">
                            <div style="background:#2b0054; color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">S</div>
                            <b>Student Career<br>Consultancy</b>
                        </div>
                        <div style="flex:2; text-align:center;"><h3>ACKNOWLEDGEMENT SLIP</h3></div>
                        <div class="ref">REF: ${refNo}<br>DATE: ${new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    <div class="head">STUDENT DETAILS</div>
                    <div class="grid">
                        <div>Name: <b>${sName.toUpperCase()}</b></div>
                        <div>Passport: <b>${sPass.toUpperCase()}</b></div>
                        <div>University: <b>${appData.university}</b></div>
                    </div>
                    <div class="status">
                        <span class="badge">✓ VERIFIED & IN-HOUSE PROCESSING</span><br><br>
                        <img src="${qrImg}" width="80"><br><small>Scan to Track</small>
                    </div>
                    <div style="text-align:center; padding-bottom:15px; font-size:12px; font-weight:bold;">"Your Dream Route to Global Education"</div>
                </div>
                <button onclick="window.print()" class="no-print" style="width:100%; padding:15px; background:#2b0054; color:white; margin-top:10px; cursor:pointer;">PRINT SLIP</button>
            </body></html>
        `);
        slipWin.document.close();

        alert("Submitted Successfully!");
        if(window.closeModal) window.closeModal();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
};
