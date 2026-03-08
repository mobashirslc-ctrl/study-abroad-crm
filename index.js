const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Master Database Connected'));

// --- SCHEMAS ---

// 1. University Schema (১৭টি ফিল্ড)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, academicScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameSuggestion: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// 2. Student File Schema (নতুন ফাইল ওপেনিং এর জন্য)
const FileSchema = new mongoose.Schema({
    studentName: String,
    contact: String,
    university: String,
    status: { type: String, default: 'Pending' },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// Admin: Add University
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Partner: Smart Search
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const query = {};
    if(country) query.country = new RegExp(`^${country}$`, 'i');
    if(degree) query.degree = degree;
    if(language) query.language = language;
    const results = await University.find(query);
    res.json(results);
});

// Partner: Submit Student File (নতুন)
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Get All Files
app.get('/api/admin/files', async (req, res) => {
    const files = await FileTrack.find().sort({ openTime: -1 });
    res.json(files);
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Running on ${PORT}`));