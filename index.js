const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB Cluster'));

// --- MODELS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, contact: String, status: { type: String, default: 'Pending' },
    wallet: { total: 0, pending: 0, withdrawn: 0 },
    subscription: { package: String, expireDate: Date },
    withdrawEnabled: { type: Boolean, default: false }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- DASHBOARD LOCKING ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// --- ADMIN APIs ---
app.post('/api/admin/add-uni', async (req, res) => {
    const uni = new University(req.body);
    await uni.save();
    res.json({ success: true });
});

app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.post('/api/admin/update-partner', async (req, res) => {
    const { id, status, subDays } = req.body;
    let expDate = new Date();
    expDate.setDate(expDate.getDate() + parseInt(subDays));
    await Partner.findByIdAndUpdate(id, { status, 'subscription.expireDate': expDate });
    res.json({ success: true });
});

// --- PARTNER APIs ---
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    let query = {};
    if(country) query.country = new RegExp(country, 'i');
    if(degree && degree !== 'All') query.degree = degree;
    res.json(await University.find(query));
});

const PORT = 10000;
app.listen(PORT, () => console.log(`🚀 System Live on Port ${PORT}`));