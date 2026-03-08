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

// University Schema (১৭টি ফিল্ড - আপনার রিকোয়ারমেন্ট অনুযায়ী)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, academicScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameSuggestion: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// Partner Schema (Status & Wallet)
const PartnerSchema = new mongoose.Schema({
    name: String, contact: String, orgName: String,
    status: { type: String, default: 'Pending' }, // Active/Deactivate
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// Student File Tracking Schema
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'Processing' },
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

// Partner: Search (Smart Assessment)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const query = {};
    if(country) query.country = new RegExp(`^${country}$`, 'i');
    if(degree) query.degree = degree;
    if(language) query.language = language;
    const results = await University.find(query);
    res.json(results);
});

// Admin: Partner Control
app.get('/api/admin/partners', async (req, res) => { res.json(await Partner.find()); });
app.post('/api/admin/partner-status', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status });
    res.json({ success: true });
});

// Routes to serve HTML
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Running on ${PORT}`));