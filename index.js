const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: System Secured")).catch(err => console.log(err));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 }
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    walletBalance: { type: Number, default: 0 }, status: { type: String, default: 'Inactive' }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, university: String,
    commissionAmount: Number, visaStatus: { type: String, default: 'Pending' }, appliedDate: { type: Date, default: Date.now }
}));

// --- Admin APIs ---
app.post('/api/admin/add-university', async (req, res) => {
    try {
        await new University(req.body).save();
        res.status(200).json({ success: true, message: "University Data Saved Successfully!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.patch('/api/admin/update-status', async (req, res) => {
    try {
        const { fileId, status } = req.body;
        const file = await StudentFile.findById(fileId);
        const partner = await Partner.findById(file.partnerId);
        if (status === 'Rejected') { partner.walletBalance -= file.commissionAmount; }
        file.visaStatus = status;
        await partner.save(); await file.save();
        res.status(200).json({ success: true });
    } catch (e) { res.status(500).send("Error"); }
});

// --- Partner APIs ---
app.post('/api/partner/apply', async (req, res) => {
    try {
        const { partnerId, uniId, studentName } = req.body;
        const uni = await University.findById(uniId);
        const partner = await Partner.findById(partnerId);
        partner.walletBalance += Number(uni.partnerCommission);
        await partner.save();
        const newFile = new StudentFile({ partnerId, studentName, university: uni.uniName, commissionAmount: Number(uni.partnerCommission) });
        await newFile.save();
        res.status(200).json({ success: true, message: "File Opened & Commission Added!" });
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/uni-search', async (req, res) => {
    const { country, degree, languageType } = req.body;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, languageType });
    res.json(results);
});

app.get('/api/partner-data/:id', async (req, res) => {
    const partner = await Partner.findById(req.params.id);
    const files = await StudentFile.find({ partnerId: req.params.id });
    res.json({ walletBalance: partner.walletBalance, files });
});

// --- Route Fixes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Live on " + PORT));