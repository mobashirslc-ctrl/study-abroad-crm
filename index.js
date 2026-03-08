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
    .catch(err => console.error('❌ DB Error:', err));

// --- Schemas ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, contact: String, status: { type: String, default: 'Pending' },
    wallet: { 
        total: { type: Number, default: 0 }, 
        pending: { type: Number, default: 0 }, 
        withdrawn: { type: Number, default: 0 } 
    },
    subscription: { package: String, expireDate: Date },
    withdrawEnabled: { type: Boolean, default: false }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    complianceMember: { name: String, contact: String },
    partnerId: mongoose.Schema.Types.ObjectId,
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- Routes to Serve Files ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// --- APIs ---
app.post('/api/admin/add-uni', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    let query = {};
    if(country) query.country = new RegExp(country, 'i');
    if(degree && degree !== 'Select Degree') query.degree = degree;
    const results = await University.find(query);
    res.json(results);
});

// Auto-block logic for expired subscription
setInterval(async () => {
    await Partner.updateMany(
        { "subscription.expireDate": { $lt: new Date() } },
        { status: 'Deactivate' }
    );
}, 86400000); // Check once a day

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));