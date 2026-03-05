const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ IHP CRM Engine Connected'));

// --- University Schema (All Fields Added) ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, degree: String, 
    intake: String, semesterFee: String, currency: String,
    languageType: String, langScore: Number, minGPA: Number,
    bankType: String, // FDR or Savings
    bankBalance: String, partnerCommission: Number, scholarship: String
});

const University = mongoose.model('University', universitySchema);
const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({ partnerName: String, amount: Number, method: String, account: String, status: { type: String, default: 'Pending' } }));
const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({ partnerName: String, studentName: String, university: String, docs: Object, status: { type: String, default: 'Pending' } }));

// --- API Endpoints ---

// ১. Eligibility Search (Multi-filter)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, language, score, gpa } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    if (language) query.languageType = language;
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
    
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

// ২. Admin: Add University
app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

// ৩. Admin: Get Stats
app.get('/api/admin/all-data', async (req, res) => {
    const files = await StudentFile.find();
    const withdraws = await Withdraw.find();
    const unis = await University.find();
    res.json({ files, withdraws, unis });
});

app.listen(10000, () => console.log('🚀 Server Live'));