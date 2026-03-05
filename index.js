const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ Connected to MongoDB'));

// Schemas
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, status: { type: String, default: 'Active' }, subAmount: { type: Number, default: 500 }
}));

const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, intake: String, degree: String, 
    languageType: String, langScore: Number, courseName: String, 
    semesterFee: String, bankReq: String, partnerCommission: Number, academicScore: Number
}));

// --- Routes to serve HTML (এই অংশটি লিঙ্ক ঠিক করবে) ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API Routes
app.post('/api/admin/add-university', async (req, res) => {
    await (new University(req.body)).save();
    res.json({ success: true });
});

app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.post('/api/admin/update-partner-status', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status });
    res.json({ success: true });
});

app.post('/api/admin/update-partner-sub', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { subAmount: req.body.subAmount });
    res.json({ success: true });
});

app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    const data = await University.find(query);
    res.json({ success: true, data });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));