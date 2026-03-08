const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());

// স্ট্যাটিক ফোল্ডার সেটআপ (এটি খুব গুরুত্বপূর্ণ)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB'));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, 
    intake: String, degree: String, language: String, langScore: String, 
    cgpa: String, fee: String, currency: String, bankBalance: String,
    bankNameSuggestion: String, loanAmount: String, maritalStatus: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ১. ইউনিভার্সিটি সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    let query = {};
    if(country) query.country = new RegExp(`^${country}$`, 'i');
    if(degree) query.degree = degree;
    if(language) query.language = language;
    const results = await University.find(query);
    res.json(results);
});

// ২. স্টুডেন্ট ফাইল সেভ করা
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ৩. ইউনিভার্সিটি অ্যাড করা
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ৪. অ্যাডমিন প্যানেলে ফাইল লিস্ট দেখা
app.get('/api/admin/files', async (req, res) => {
    const files = await FileTrack.find().sort({ openTime: -1 });
    res.json(files);
});

// --- ROUTES (লিঙ্ক ঠিক করার জন্য) ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Live on ${PORT}`));