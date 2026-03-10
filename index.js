const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Mission Database Hard-Locked"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 1. UNIVERSITY SCHEMA (21 FIELDS READY) ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: Number,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String
});
const University = mongoose.model('University', UniSchema);

// --- 2. PARTNER SCHEMA (WITH WALLET) ---
const PartnerSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    status: { type: String, default: 'Pending' }, 
    walletBalance: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- 3. STUDENT FILE SCHEMA (FOR COMMISSION HISTORY) ---
const StudentFileSchema = new mongoose.Schema({
    partnerId: String,
    studentName: String,
    contactNo: String,
    passportNo: String,
    studentEmail: String,
    uniName: String,
    commission: Number,
    status: { type: String, default: 'Pending' }, // Pending / Fixed / Rejected
    complianceStatus: { type: String, default: 'File Received' },
    date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// ==========================================
// HTML ROUTING
// ==========================================
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// ==========================================
// API ROUTES (LOCKED)
// ==========================================

// --- PARTNER AUTH ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.json({ msg: "Success" });
    } catch (e) { res.status(400).json({ msg: "Email exists" }); }
});

app.post('/api/partner/login', async (req, res) => {
    const { email, pass } = req.body;
    const p = await Partner.findOne({ email, pass });
    if (!p) return res.status(401).json({ msg: "Invalid Credentials" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Account Pending Approval" });
    res.json({ id: p._id, name: p.name });
});

// --- PARTNER DASHBOARD & WALLET ---
app.get('/api/partner/details/:id', async (req, res) => {
    const p = await Partner.findById(req.params.id);
    res.json(p);
});

// --- COMMISSION & FILE SUBMISSION ---
app.post('/api/partner/submit-file', async (req, res) => {
    try {
        const newFile = new StudentFile(req.body);
        await newFile.save();
        res.json({ msg: "File Submitted" });
    } catch (e) { res.status(500).json({ msg: "Error submitting file" }); }
});

app.get('/api/partner/history/:partnerId', async (req, res) => {
    const history = await StudentFile.find({ partnerId: req.params.partnerId }).sort({ date: -1 });
    res.json(history);
});

// --- ADMIN & COMPLIANCE ACTIONS ---
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ msg: "Updated" });
});

app.post('/api/admin/add-university', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ msg: "Saved" });
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

// Compliance Verification (Commission Fix/Reject)
app.put('/api/admin/verify-file/:fileId', async (req, res) => {
    const { action } = req.body; 
    const file = await StudentFile.findById(req.params.fileId);
    
    if (file && file.status === 'Pending') {
        if (action === 'Fix') {
            file.status = 'Fixed';
            file.complianceStatus = 'File Opening Start';
            await Partner.findByIdAndUpdate(file.partnerId, { $inc: { walletBalance: file.commission } });
        } else {
            file.status = 'Rejected';
            file.complianceStatus = 'File Rejected';
        }
        await file.save();
        res.json({ msg: "Success" });
    } else {
        res.status(400).json({ msg: "File already processed or not found" });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on Port ${PORT}`));