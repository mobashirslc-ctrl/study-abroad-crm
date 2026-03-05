const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ MongoDB Linked with IHP CRM'));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, degree: String, intake: String, semesterFee: String, 
    currency: String, languageType: String, langScore: Number, minGPA: Number, 
    bankType: String, bankBalance: String, partnerCommission: Number, scholarship: String
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerName: String, amount: Number, method: String, account: String, 
    status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerName: String, studentName: String, university: String, 
    status: { type: String, default: 'Processing' }, date: { type: Date, default: Date.now }
}));

// --- Routes ---

// Admin: Add University
app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

// Admin/Partner: Get All Data
app.get('/api/admin/withdraws', async (req, res) => res.json(await Withdraw.find().sort({_id:-1})));
app.get('/api/admin/files', async (req, res) => res.json(await StudentFile.find().sort({_id:-1})));
app.get('/api/admin/unis', async (req, res) => res.json(await University.find().sort({_id:-1})));

// Partner: Search & Withdraw
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, language } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.post('/api/partner/withdraw', async (req, res) => {
    await (new Withdraw(req.body)).save();
    res.json({ success: true });
});

app.listen(10000, () => console.log('🚀 Engine Live'));