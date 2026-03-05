const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ CRM Backend Connected'));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, degree: String, intake: String, 
    semesterFee: String, currency: String, languageType: String, 
    langScore: Number, minGPA: Number, bankType: String, 
    bankBalance: String, partnerCommission: Number
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: String, status: { type: String, default: 'Active' }, // Active/Inactive
    earnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 },
    subscription: { type: String, default: 'Basic' }, subAmount: { type: Number, default: 500 }
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerName: String, amount: Number, method: String, // bKash, Nagad, Bank
    account: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerName: String, studentName: String, university: String, status: { type: String, default: 'Pending' }
}));

// --- Admin Routes ---
app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/admin/update-partner-status', async (req, res) => {
    const { id, status } = req.body;
    await Partner.findByIdAndUpdate(id, { status });
    res.json({ success: true });
});

app.post('/api/admin/custom-sub', async (req, res) => {
    const { id, amount } = req.body;
    await Partner.findByIdAndUpdate(id, { subAmount: amount });
    res.json({ success: true });
});

app.get('/api/admin/withdraw-requests', async (req, res) => res.json(await Withdraw.find().sort({_id:-1})));

// --- Partner Routes ---
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, langScore } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    if (langScore) query.langScore = { $lte: parseFloat(langScore) };
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.post('/api/partner/withdraw', async (req, res) => {
    await (new Withdraw(req.body)).save();
    res.json({ success: true });
});

app.listen(10000, () => console.log('🚀 Server is running on port 10000'));