import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { /* আপনার কনফিগ এখানে দিন */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ১. রিয়েল-টাইম ওয়ালেট আপডেট (Pending & Available Balance)
onSnapshot(collection(db, "applications"), (snap) => {
    let pendingTotal = 0;
    let availableTotal = 0;
    snap.forEach(doc => {
        const data = doc.data();
        const comm = parseFloat(data.commission || 0);
        if (data.status === "Pending") pendingTotal += comm;
        else if (data.status === "Approved" || data.status === "Success") availableTotal += comm;
    });
    document.getElementById('pendingAm').innerText = `৳ ${pendingTotal.toLocaleString()}`;
    document.getElementById('availAm').innerText = `৳ ${availableTotal.toLocaleString()}`;
});

// ২. স্মার্ট রিয়েল-টাইম সার্চ (GPA এবং IELTS ফিল্টারসহ)
window.runSearch = () => {
    const tbody = document.getElementById('uniResultsBody');
    const fCountry = document.getElementById('fCountry').value.toLowerCase().trim();
    const fDegree = document.getElementById('fDegree').value; 
    const fUserGPA = parseFloat(document.getElementById('fAcad').value) || 0;
    const fUserIELTS = parseFloat(document.getElementById('fScore').value) || 0;

    document.getElementById('resArea').style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">সার্চ করা হচ্ছে...</td></tr>';

    onSnapshot(collection(db, "universities"), (snap) => {
        let rows = "";
        let foundCount = 0;
        snap.forEach(doc => {
            const u = doc.data();
            const dbGPA = parseFloat(u.minGPA || 0);
            const dbIELTS = parseFloat(u.ieltsOverall || 0);

            // ফিল্টারিং লজিক
            const matchCountry = !fCountry || u.country.toLowerCase().includes(fCountry);
            const matchDegree = !fDegree || u.degreeType === fDegree;
            const matchGPA = !fUserGPA || fUserGPA >= dbGPA;
            const matchIELTS = !fUserIELTS || fUserIELTS >= dbIELTS;

            if (matchCountry && matchDegree && matchGPA && matchIELTS) {
                foundCount++;
                const semesterFee = parseFloat(u.semesterFee) || 0;
                const totalComm = (semesterFee * 120 * parseFloat(u.partnerComm || 0)) / 100;

                rows += `
                <tr>
                    <td>${u.universityName}</td><td>${u.degreeType}</td><td>${u.courseName}</td>
                    <td>$${u.semesterFee}</td><td style="color:#00ff00;">৳ ${Math.round(totalComm).toLocaleString()}</td>
                    <td>${u.gapAcceptance} Yrs</td><td>${dbGPA}</td><td>${dbIELTS}</td>
                    <td>${u.scholarship}</td><td>${u.intake}</td>
                    <td><button class="btn-gold" onclick="openApp('${u.universityName}', ${totalComm})">Open File</button></td>
                </tr>`;
            }
        });
        tbody.innerHTML = foundCount > 0 ? rows : '<tr><td colspan="11" style="text-align:center; color:red;">কোনো ডাটা পাওয়া যায়নি।</td></tr>';
    });
};