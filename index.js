const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Core Locked")).catch(err => console.log(err));

// --- Permanently Locked Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 }
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, expiryDate: Date,
    walletBalance: { type: Number, default: 0 }, subscriptionStatus: { type: String, default: 'Due' }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, contact: String, university: String,
    commissionAmount: Number, visaStatus: { type: String, default: 'Pending' }, 
    complianceMember: String, appliedDate: { type: Date, default: Date.now }
}));

// --- Core APIs ---
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/uni-search', async (req, res) => {
    const { country, degree, languageType } = req.body;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, languageType });
    res.json(results);
});

// --- Final Route Locks ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

app.listen(process.env.PORT || 10000);