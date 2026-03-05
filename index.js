const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ CRM DB Connected'));

// --- Schemas ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: String, status: { type: String, default: 'Active' },
    earnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 },
    subPlan: { type: String, default: 'Professional' }
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerName: String, amount: Number, method: String, account: String, 
    status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, degree: String, intake: String, 
    semesterFee: String, currency: String, languageType: String, 
    langScore: Number, academicScore: Number, partnerCommission: Number
}));

// --- Routes ---
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.post('/api/partner/withdraw', async (req, res) => {
    await (new Withdraw(req.body)).save();
    res.json({ success: true });
});

app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, academicScore } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    if (academicScore) query.academicScore = { $lte: parseFloat(academicScore) };
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.listen(10000, () => console.log('🚀 Server running'));