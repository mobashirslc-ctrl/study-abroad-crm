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

// 1. University Schema
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, intake: String,
    degree: String, language: String, minScore: String, academicScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankName: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// 2. Partner Schema (Status & Subscription Control)
const PartnerSchema = new mongoose.Schema({
    name: String, status: { type: String, default: 'Pending' }, // Active/Deactivate
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// 3. File Tracking Schema
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, 
    status: String, openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// University Add (Admin)
app.post('/api/add-uni', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ success: true });
});

// Smart Assessment (Partner) with Subscription Check
app.get('/api/search-uni', async (req, res) => {
    // এখানে সাবস্ক্রিপশন চেক লজিক (expire হলে ব্লক)
    const { country, degree, language } = req.query;
    const results = await University.find({ 
        country: new RegExp(`^${country}$`, 'i'), 
        degree: degree, 
        language: language 
    });
    res.json(results);
});

// Partner Status Control (Admin)
app.post('/api/partner-status', async (req, res) => {
    const { id, status } = req.body;
    await Partner.findByIdAndUpdate(id, { status });
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 System Running on ${PORT}`));