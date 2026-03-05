const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Connection Error:', err));

// --- Schemas ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, status: { type: String, default: 'Active' },
    subAmount: { type: Number, default: 500 }
}));

const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, degree: String, intake: String, 
    semesterFee: String, currency: String, languageType: String, 
    langScore: Number, academicScore: Number, partnerCommission: Number, bankReq: String
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerName: String, amount: Number, method: String, account: String, 
    status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    studentName: String, university: String, partnerName: String, 
    status: { type: String, default: 'In Review' }, date: { type: Date, default: Date.now }
}));

// --- Admin API Routes ---
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.post('/api/admin/update-partner-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        await Partner.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/custom-sub', async (req, res) => {
    const { id, amount } = req.body;
    try {
        await Partner.findByIdAndUpdate(id, { subAmount: amount });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/all-files', async (req, res) => res.json(await StudentFile.find().sort({_id:-1})));
app.get('/api/admin/withdrawals', async (req, res) => res.json(await Withdraw.find().sort({_id:-1})));

app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

// --- Partner API Routes ---
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, languageType, langScore, academicScore } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree && degree !== "Select Degree") query.degree = degree;
    if (langScore) query.langScore = { $lte: parseFloat(langScore) };
    if (academicScore) query.academicScore = { $lte: parseFloat(academicScore) };
    const data = await University.find(query);
    res.json({ success: true, data });
});

app.listen(10000, () => console.log('🚀 Server active on 10000'));