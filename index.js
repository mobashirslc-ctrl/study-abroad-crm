const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ১. ইউনিভার্সিটি স্কিমা (সব ২১টি ফিল্ড লক করা)
const universitySchema = new mongoose.Schema({
    country: String,
    uniName: String,
    courseName: String,
    intake: String,
    degree: { type: String, enum: ['UG', 'PG', 'DIPLOMA', 'FOUNDATION', 'RESEARCH', 'PHD'] },
    languageType: { type: String, enum: ['IELTS', 'PTE', 'DUOLINGO'] },
    academicScore: String,
    languageScore: String,
    studyGap: String, // আপনার নতুন রিকয়ারমেন্ট
    semesterFee: Number,
    currency: { type: String, enum: ['DOLLAR', 'AUSTRALIA DOLLAR', 'CANADIAN DOLLAR', 'EURO', 'TAKA', 'UK POUND'] },
    bankBalance: String,
    bankType: { type: String, enum: ['FDR', 'SAVINGS'] },
    maritalStatus: { type: String, enum: ['Single', 'With spouse'] },
    bankNameBD: String,
    loanAmount: String,
    partnerCommission: String,
    addedBy: String // Admin or Team
});

// ২. পার্টনার স্কিমা (Manual Approval & Auto-block)
const partnerSchema = new mongoose.Schema({
    name: String,
    email: String,
    contact: String,
    status: { type: String, default: 'Pending' }, // Pending, Active, Deactivate
    subscriptionExpire: Date,
    wallet: { total: Number, pending: Number, withdrawn: Number },
    withdrawEnabled: { type: Boolean, default: false }
});

const University = mongoose.model('University', universitySchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- পারমানেন্ট লিঙ্ক (Routing Lock) ---

// Admin Dashboard Link
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Partner Dashboard Link
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/partner.html'));
});

// Compliance Dashboard Link
app.get('/compliance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/compliance.html'));
});

// Team Dashboard Link
app.get('/team', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/team.html'));
});

// --- API লজিক (Real-time) ---

// স্মার্ট অ্যাসেসমেন্ট সার্চ (সব ফিল্ডসহ)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language, studyGap } = req.query;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree !== 'All') query.degree = degree;
    if (language !== 'All') query.languageType = language;
    
    const results = await University.find(query);
    res.json(results);
});

// সাবস্ক্রিপশন চেক মিডলওয়্যার (Auto-block)
const checkAuth = async (req, res, next) => {
    const partner = await Partner.findById(req.headers.partnerid);
    if (!partner || partner.status !== 'Active') return res.status(403).send("Account Inactive");
    if (new Date() > partner.subscriptionExpire) {
        partner.status = 'Deactivate';
        await partner.save();
        return res.status(403).send("Subscription Expired. Blocked!");
    }
    next();
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Locked on Port ${PORT}`));