const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION (FIXED) ---
// process.env.MONGODB_URI সরাসরি কল করা হয়েছে। 
// নিশ্চিত করুন Render-এ ভ্যালু সেভ করার পর একবার 'Manual Deploy' দিয়েছেন।
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected & Locked"))
    .catch(err => {
        console.error("❌ DB Connection Error. Please check MONGODB_URI in Render Settings.");
        console.error("Error Message:", err.message);
    });

// --- 1. UNIVERSITY SCHEMA (21 FIELDS CAPABLE) ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, semesterFee: String, 
    partnerCommission: Number, bankNameBD: String, loanAmount: String, 
    maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

// --- 2. PARTNER SCHEMA ---
const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- 3. STUDENT FILE SCHEMA ---
const StudentFileSchema = new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String,
    uniName: String, commission: Number, date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// ==========================================
// API & ROUTING SECTION
// ==========================================

// Page Routes
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// --- Partner Auth ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const p = new Partner(req.body);
        await p.save();
        res.json({ msg: "Success" });
    } catch (e) { res.status(400).json({ msg: "Email exists" }); }
});

app.post('/api/partner/login', async (req, res) => {
    const { email, pass } = req.body;
    const p = await Partner.findOne({ email, pass });
    if (!p) return res.status(401).json({ msg: "Invalid Credentials" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Pending Approval" });
    res.json({ id: p._id, name: p.name });
});

// --- Partner Dashboard APIs ---
app.get('/api/partner/details/:id', async (req, res) => {
    try {
        const p = await Partner.findById(req.params.id);
        res.json(p);
    } catch (e) { res.status(404).send(); }
});

app.post('/api/partner/submit-file', async (req, res) => {
    try {
        const { partnerId, commission } = req.body;
        const newFile = new StudentFile(req.body);
        await newFile.save();
        // Wallet Update
        await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });
        res.json({ msg: "Success" });
    } catch (e) { res.status(500).send(); }
});

// --- Admin APIs ---
app.get('/api/admin/partners', async (req, res) => {
    res.json(await Partner.find());
});

app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ msg: "Updated" });
});

app.post('/api/admin/add-university', async (req, res) => {
    const u = new University(req.body);
    await u.save();
    res.json({ msg: "Saved" });
});

app.get('/api/universities', async (req, res) => {
    res.json(await University.find());
});

// --- SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Mission Control running on port ${PORT}`);
});