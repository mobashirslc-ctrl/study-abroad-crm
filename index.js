const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
mongoose.connect('YOUR_MONGODB_URI_HERE', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Database Connected & Locked")).catch(err => console.log(err));

// --- 1. UNIVERSITY SCHEMA (LOCKED: 21 FIELDS) ---
const UniversitySchema = new mongoose.Schema({
    // Academic & Basic
    uniName: String, location: String, country: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    
    // Financials
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: String,
    
    // Requirements
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String // (Fixed/Transactional)
});
const University = mongoose.model('University', UniversitySchema);

// --- 2. PARTNER SCHEMA (LOCKED: AUTH & WALLET) ---
const PartnerSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    status: { type: String, default: 'Pending' }, // Pending / Active
    walletBalance: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ==========================================
// API ROUTES (PART 1, 2 & 3)
// ==========================================

// --- PARTNER AUTHENTICATION (PART 1 & 2) ---

// Registration
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, pass } = req.body;
        const existing = await Partner.findOne({ email });
        if (existing) return res.status(400).json({ msg: "Email already exists" });

        const newPartner = new Partner({ name, email, pass });
        await newPartner.save();
        res.json({ msg: "Registration Successful! Waiting for Admin Approval." });
    } catch (e) {
        res.status(500).json({ msg: "Server Error" });
    }
});

// Login
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

// --- ADMIN CONTROL: PARTNER STATUS (PART 2) ---
app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

app.put('/api/admin/partner-status/:id', async (req, res) => {
    const { status } = req.body;
    await Partner.findByIdAndUpdate(req.params.id, { status });
    res.json({ msg: "Status Updated" });
});

// --- UNIVERSITY MANAGEMENT (PART 3 - LOCKED 21 FIELDS) ---

// Add University
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ msg: "University Data Locked & Saved Successfully!" });
    } catch (e) {
        res.status(500).json({ msg: "Error saving university" });
    }
});

// Get All Universities
app.get('/api/universities', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

// --- PARTNER PORTAL: GET DETAILS (PART 4 PREP) ---
app.get('/api/partner/details/:id', async (req, res) => {
    const p = await Partner.findById(req.params.id);
    res.json(p);
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Mission Running on Port ${PORT}`);
});