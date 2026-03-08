const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to Master Database'));

// --- SCHEMAS ---

// ১. ইউনিভার্সিটি স্কিমা (Assessment এর জন্য)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, 
    intake: String, degree: String, language: String, langScore: String, 
    cgpa: String, fee: String, currency: String, bankBalance: String,
    bankNameSuggestion: String, loanAmount: String, maritalStatus: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. স্টুডেন্ট ফাইল ট্র্যাকিং স্কিমা
const FileSchema = new mongoose.Schema({
    studentName: String,
    contact: String,
    university: String,
    status: { type: String, default: 'Pending' }, // Visa Status tracking
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// ৩. পার্টনার স্কিমা (Activation & Subscription)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String,
    status: { type: String, default: 'Pending' }, // Active or Deactivate
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscriptionExpire: Date
});
const Partner = mongoose.model('Partner', PartnerSchema);

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
    let query = {};
    if(country) query.country = new RegExp(`^${country}$`, 'i');
    if(degree) query.degree = degree;
    if(language) query.language = language;
    
    const results = await University.find(query);
    res.json(results);
});

// Partner: Open Student File
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Get All Files for Tracking (এটিই আগে মিসিং ছিল)
app.get('/api/admin/files', async (req, res) => {
    try {
        const files = await FileTrack.find().sort({ openTime: -1 });
        res.json(files);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Get Partner List
app.get('/api/admin/partners', async (req, res) => {
    try {
        const partners = await Partner.find();
        res.json(partners);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Live on ${PORT}`));