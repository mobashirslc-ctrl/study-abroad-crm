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
    .then(() => console.log('✅ CRM Master Connected to MongoDB'))
    .catch(err => console.error('❌ Connection Error:', err));

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

// --- Routes to Serve HTML Files ---
// এই রুটগুলোই আপনার 404 এরর সমাধান করবে
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

app.get('/compliance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'compliance.html'));
});

// --- APIs ---

// Admin: Add University
app.post('/api/admin/add-uni', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "University Added!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Partner: Search University
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    const query = {};
    if(country) query.country = new RegExp(country, 'i');
    if(degree && degree !== 'Select Degree') query.degree = degree;
    const results = await University.find(query);
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on port ${PORT}`));