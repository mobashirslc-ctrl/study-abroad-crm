import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

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

// --- ১. লাইভ ট্র্যাকিং ও ড্যাশবোর্ড আপডেট (Fix for Blank Tables) ---
const syncDashboard = () => {
    // 'createdAt' অনুযায়ী সর্টিং করা হয়েছে যাতে নতুন ফাইল উপরে থাকে
    const q = query(
        collection(db, "applications"), 
        where("partnerEmail", "==", userEmail.toLowerCase()),
        orderBy("createdAt", "desc")
    );
    
    onSnapshot(q, (snap) => {
        let pending = 0; let final = 0; let html = "";
        
        snap.forEach(dSnap => {
            const d = dSnap.data();
            const comm = Number(d.commission || 0);
            const status = (d.status || "submitted").toLowerCase();
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-GB') : 'Processing...';

            // কমিশন ক্যালকুলেশন
            if (status !== 'visa rejected') {
                if (status === 'student paid to uni') final += comm;
                else if (status === 'verified') pending += comm;
            }

            // টেবিল রো জেনারেশন
            html += `<tr>
                <td><b>${d.studentName}</b><br><small>${d.university}</small></td>
                <td>${d.passportNo}</td>
                <td><span class="status-pill ${status}">${status.toUpperCase()}</span></td>
                <td><a href="${d.docs?.academic || '#'}" target="_blank" style="color:var(--gold); font-weight:bold;">View</a></td>
                <td>${dateStr}</td>
            </tr>`;
        }); 

        // ড্যাশবোর্ড এবং ট্র্যাকিং মেনু—উভয় জায়গার টেবিল আপডেট করবে
        const homeT = document.getElementById('homeTrackingBody');
        const trackT = document.getElementById('trackingTableBody'); 
        
        if(homeT) homeT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        if(trackT) trackT.innerHTML = html || "<tr><td colspan='5' align='center'>No Applications Found</td></tr>";
        
        document.getElementById('topPending').innerText = `৳${pending.toLocaleString()}`;
        document.getElementById('topFinal').innerText = `৳${final.toLocaleString()}`;
    });
};
syncDashboard(); 

// --- ২. ফাইল আপলোড লজিক (Error Fix for Null/Undefined) ---
const uploadFile = async (file) => {
    if (!file) return "No File";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ihp_upload");
    try {
        const res = await fetch("https://api.cloudinary.com/v1_1/ddziennkh/auto/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || "No File";
    } catch (err) { 
        console.error("Upload Error:", err);
        return "No File"; 
    }
}; 

// --- ৩. অ্যাপ্লিকেশন সাবমিট ও ডিজাইনড স্লিপ ---
document.getElementById('submitAppBtn').onclick = async () => {
    const btn = document.getElementById('submitAppBtn');
    const sName = document.getElementById('appSName').value;
    const sPass = document.getElementById('appSPass').value; 
    
    if(!sName || !sPass) return alert("Student Name and Passport are required!");
    
    btn.innerText = "Uploading Files..."; btn.disabled = true; 

    try {
        // ফাইল এলিমেন্টগুলো চেক করা হচ্ছে
        const acadInput = document.getElementById('fileAcad');
        const passInput = document.getElementById('filePass');
        
        const acadUrl = await uploadFile(acadInput.files[0]);
        const passUrl = await uploadFile(passInput.files[0]); 

        const appData = {
            studentName: sName,
            passportNo: sPass,
            university: window.selectedUni ? window.selectedUni.name : "Pending",
            commission: window.selectedUni ? Number(window.selectedUni.comm) : 0,
            partnerEmail: userEmail.toLowerCase(),
            status: 'submitted', 
            docs: { academic: acadUrl, passport: passUrl },
            createdAt: serverTimestamp()
        }; 

        // ডাটাবেজে সেভ
        await addDoc(collection(db, "applications"), appData);
        
        // --- PREMIUM SLIP GENERATION ---
        const slipWin = window.open('', '_blank');
        const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://crm-nine.vercel.app/track.html?passport=${sPass}`;
        const refNo = `SCC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        slipWin.document.write(`
            <html><head><title>Admission Slip - SCC</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; padding: 20px; }
                .slip-container { background: white; max-width: 800px; margin: auto; border-bottom: 10px solid #2b0054; position: relative; }
                .header { display: flex; align-items: center; padding: 20px; border-bottom: 2px solid #00a651; }
                .logo-box { flex: 1; display: flex; align-items: center; gap: 10px; }
                .title-box { flex: 2; text-align: center; border-left: 1px solid #ddd; border-right: 1px solid #ddd; padding: 0 10px; }
                .ref-box { flex: 1; text-align: right; font-size: 12px; line-height: 1.5; }
                .section-title { background: #e9ecef; padding: 8px 15px; font-weight: bold; font-size: 14px; margin: 15px 0; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; padding: 0 20px; gap: 10px; font-size: 14px; }
                .agency-strip { background: #00a651; color: white; padding: 8px 20px; margin-top: 20px; font-weight: bold; }
                .status-container { text-align: center; padding: 20px; margin: 20px; border: 2px dashed #00a651; border-radius: 10px; }
                .verified-badge { background: #00a651; color: white; padding: 5px 15px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
                @media print { .no-print { display: none; } body { padding: 0; background: white; } }
            </style></head><body>
                <div class="slip-container">
                    <div class="header">
                        <div class="logo-box">
                            <div style="background:#2b0054; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">S</div>
                            <b>Student Career<br>Consultancy</b>
                        </div>
                        <div class="title-box">
                            <h3 style="margin:0; font-size:18px;">OFFICIAL ACKNOWLEDGEMENT & ADMISSION SLIP</h3>
                        </div>
                        <div class="ref-box">
                            REF NO: <b>${refNo}</b><br>
                            ISSUE DATE: <b>${new Date().toLocaleDateString('en-GB')}</b>
                        </div>
                    </div>
                    <div class="section-title">APPLICANT INFORMATION</div>
                    <div class="grid">
                        <div>Full Name: <b>${sName.toUpperCase()}</b></div>
                        <div>Passport No: <b>${sPass.toUpperCase()}</b></div>
                        <div>Destination: <b>Global Study Hub</b></div>
                        <div>Course: <b>MSc/Bachelors Program</b></div>
                    </div>
                    <div class="agency-strip">AUTHORIZED AGENCY DETAILS</div>
                    <div class="grid" style="padding-top:10px;">
                        <div>Agency Name: <b>Partner Processing Network</b></div>
                        <div>Agent ID: <b>SCC-PARTNER-${userEmail.slice(0,3).toUpperCase()}</b></div>
                    </div>
                    <div class="status-container">
                        <div class="verified-badge">✓ VERIFIED & IN-HOUSE PROCESSING</div><br>
                        <img src="${qrImg}" width="90"><br>
                        <small>Scan to Track Application Status</small>
                    </div>
                    <div style="text-align:right; padding: 20px 40px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Kirsch_Signature.png" width="80" style="opacity:0.8;"><br>
                        <div style="border-top:1px solid #000; width:150px; float:right; font-size:11px; font-weight:bold; margin-top:5px;">AUTHORIZED SIGNATURE & STAMP</div>
                    </div>
                    <div style="clear:both; text-align:center; padding-bottom:20px; color:#2b0054; font-size:13px; font-weight:bold;">
                        "Your Dream Route to Global Education"
                    </div>
                </div>
                <button onclick="window.print()" class="no-print" style="position:fixed; bottom:20px; right:20px; padding:10px 30px; background:#2b0054; color:white; border:none; border-radius:5px; cursor:pointer;">Print Slip</button>
            </body></html>
        `);
        slipWin.document.close();

        alert("Application Submitted Successfully!");
        closeModal();
    } catch (e) {
        alert("System Error: " + e.message);
        console.error(e);
    } finally {
        btn.innerText = "CONFIRM ENROLLMENT"; btn.disabled = false;
    }
}; 
