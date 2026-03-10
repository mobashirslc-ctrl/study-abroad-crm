const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION (USING ENVIRONMENT VARIABLE) ---
// Render-এর 'Environment' সেকশনে আপনি যে MONGODB_URI দিয়েছেন সেটি এখানে কাজ করবে
const mongoURI = process.env.MONGODB_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected & Locked"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 1. UNIVERSITY SCHEMA (LOCKED: 21 FIELDS) ---
const UniversitySchema = new mongoose.Schema({
    uniName: String, location: String, country: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: String,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String
});
const University = mongoose.model('University', UniversitySchema);

// --- 2. PARTNER SCHEMA ---
const PartnerSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    status: { type: String, default: 'Pending' }, 
    walletBalance: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTING FIX ---
// এখন আপনার লিঙ্কের শেষে /login লিখলে সরাসরি লগইন পেজ আসবে
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- AUTH API (PART 1 & 2) ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, pass } = req.body;
        const existing = await Partner.findOne({ email });
        if (existing) return res.status(400).json({ msg: "Email exists" });

        const newPartner = new Partner({ name, email, pass });
        await newPartner.save();
        res.json({ msg: "Success" });
    } catch (e) {
        res.status(500).json({ msg: "Server Error" });
    }
});

app.post('/api/partner/login', async (req, res) => {
    try {
        const { email, pass } = req.body;
        const p = await Partner.findOne({ email, pass });
        
        if (!p) return res.status(401).json({ msg: "Invalid Credentials" });
        if (p.status !== 'Active') return res.status(401).json({ msg: "Account Pending Approval" });

        res.json({ id: p._id, name: p.name });
    } catch (e) {
        res.status(500).json({ msg: "Login Error" });
    }
});

// --- UNIVERSITY API (PART 3) ---
app.get('/api/universities', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

// --- SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Mission Running on Port ${PORT}`);
});