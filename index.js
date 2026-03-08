const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Master Database Connected'));

// 1. University Schema (As per your requirement)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, intake: String,
    degree: String, language: String, minScore: String, academicScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankName: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// 2. Partner Schema (With Subscription & Wallet)
const PartnerSchema = new mongoose.Schema({
    name: String, email: String, 
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date, status: String } // Active/Blocked
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- APIs ---

// সাবস্ক্রিপশন চেক মিডলওয়্যার (Expired হলে ব্লক করবে)
const checkSubscription = async (req, res, next) => {
    // এখানে ডামি হিসেবে একটি চেক দেওয়া হলো, ভবিষ্যতে লগইন সিস্টেমের সাথে কানেক্ট হবে
    const expiry = new Date('2026-12-31'); 
    if (new Date() > expiry) return res.status(403).send("Subscription Expired! Portal Blocked.");
    next();
};

app.post('/api/add-uni', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ success: true });
});

app.get('/api/search-uni', checkSubscription, async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ 
        country: new RegExp(`^${country}$`, 'i'), 
        degree: degree.toUpperCase(), 
        language: language.toUpperCase() 
    });
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));