const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB'));

// --- SCHEMAS ---

// 1. University Schema (১৭টি ফিল্ড)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, academicScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameSuggestion: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// 2. Partner Schema (Subscription & Status)
const PartnerSchema = new mongoose.Schema({
    name: String, contact: String, orgName: String,
    status: { type: String, default: 'Pending' }, // Active/Deactivate
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// 3. Student File Schema
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'Processing' },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// Admin: Add University
app.post('/api/add-uni', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ success: true });
});

// Partner: Smart Search (Auto-Block Check)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    // এখানে ভবিষ্যতে পার্টনার সাবস্ক্রিপশন চেক লজিক বসবে
    const results = await University.find({ 
        country: new RegExp(`^${country}$`, 'i'), 
        degree: degree, 
        language: language 
    });
    res.json(results);
});

// Student File Open
app.post('/api/open-file', async (req, res) => {
    const newFile = new FileTrack(req.body);
    await newFile.save();
    res.json({ success: true });
});

// Admin: Controls
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.get('/api/admin/files', async (req, res) => res.json(await FileTrack.find().sort({openTime: -1})));

// Routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Live on ${PORT}`));