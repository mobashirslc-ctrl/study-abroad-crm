const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ MongoDB Linked'))
    .catch(err => console.error(err));

// --- Updated University Schema with All Fields ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, degree: String, 
    intake: String, semesterFee: String, currency: String,
    languageType: String, langScore: Number, minGPA: Number,
    bankType: String, bankBalance: String, partnerCommission: Number
});

const University = mongoose.model('University', universitySchema);
const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    studentName: String, partnerName: String, university: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

// --- Routes ---

// Admin: Add University (Assessment Database)
app.post('/api/admin/add-university', async (req, res) => {
    try { await (new University(req.body)).save(); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ success: false }); }
});

// Admin: Get Existing Files
app.get('/api/admin/files', async (req, res) => {
    const files = await StudentFile.find().sort({_id: -1});
    res.json(files);
});

// Partner: Eligibility Check (Advanced Search)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, language, gpa } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    if (language) query.languageType = language;
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };

    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.listen(10000, () => console.log('🚀 CRM Backend Running'));