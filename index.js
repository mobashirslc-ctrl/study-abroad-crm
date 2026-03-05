const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ IHP CRM DB Connected'));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, degree: String, intake: String, 
    semesterFee: String, currency: String, languageType: String, 
    langScore: Number, minGPA: Number, partnerCommission: Number
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, status: { type: String, default: 'Active' },
    earnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 },
    subPlan: { type: String, default: 'Professional' }, subExpiry: String
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerName: String, amount: Number, method: String, account: String, 
    status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    studentName: String, university: String, partnerName: String, 
    status: { type: String, default: 'In Review' }, date: { type: Date, default: Date.now }
}));

// --- Routes ---
app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

app.get('/api/admin/all-files', async (req, res) => res.json(await StudentFile.find().sort({_id:-1})));
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.get('/api/admin/withdrawals', async (req, res) => res.json(await Withdraw.find().sort({_id:-1})));

app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, languageType, langScore } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    if (languageType) query.languageType = languageType;
    if (langScore) query.langScore = { $lte: parseFloat(langScore) };
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.post('/api/partner/withdraw', async (req, res) => {
    await (new Withdraw(req.body)).save();
    res.json({ success: true });
});

app.listen(10000, () => console.log('🚀 CRM Engine Active'));