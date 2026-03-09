const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection Fix
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Database Connected & Locked")).catch(err => console.log("DB Error:", err.message));

// ২০+ ফিল্ডের ইউনিভার্সিটি স্কিমা
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

// পার্টনার স্কিমা (Contact No সহ)
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contactNo: String, status: { type: String, default: 'Active' }, expiryDate: String
}));

// --- APIs ---
// ১. ইউনিভার্সিটি সেভ API
app.post('/api/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).send("Success"); } 
    catch (err) { res.status(500).send("Error Saving Data"); }
});

// ২. ডাটা লোড API
app.get('/api/admin-data', async (req, res) => {
    const partners = await Partner.find();
    const unis = await University.find();
    res.json({ partners, unis });
});

// ৩. পার্টনার আপডেট API (Fixed Button Logic)
app.patch('/api/update-partner/:id', async (req, res) => {
    try {
        const { status, expiryDate } = req.body;
        await Partner.findByIdAndUpdate(req.params.id, { status, expiryDate });
        res.status(200).json({ message: "Update Success" });
    } catch (err) { res.status(500).json({ message: "Update Failed" }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Live on " + PORT));