const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB Cluster'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// --- Models ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, status: { type: String, default: 'Pending' },
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date },
    withdrawEnabled: { type: Boolean, default: false }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    complianceMember: { name: {type: String, default: 'Unassigned'}, contact: String },
    partnerId: mongoose.Schema.Types.ObjectId,
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// Admin: Add University
app.post('/api/admin/add-uni', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "University Added!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Partner: Smart Assessment Search
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    const query = {};
    if(country) query.country = new RegExp(country, 'i');
    if(degree && degree !== 'Select Degree') query.degree = degree;
    const results = await University.find(query);
    res.json(results);
});

// Compliance: Release Commission
app.post('/api/compliance/release', async (req, res) => {
    const { partnerId, fileId, compName, compContact } = req.body;
    await Partner.findByIdAndUpdate(partnerId, { withdrawEnabled: true });
    await FileTrack.findByIdAndUpdate(fileId, { 
        status: 'Commission Active',
        'complianceMember.name': compName,
        'complianceMember.contact': compContact
    });
    res.json({ success: true });
});

const PORT = 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on http://localhost:${PORT}`));