const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Partner Core Locked")).catch(err => console.log(err));

// --- Schemas (Updated with Wallet & Files) ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    appFee: String, deadline: String, scholarship: String, workRights: String, location: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, orgName: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, // Registration Approval System
    walletBalance: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String,
    studentContact: String,
    universityName: String,
    commissionAmount: Number,
    status: { type: String, default: 'File Opening' },
    createdAt: { type: Date, default: Date.now }
}));

// --- Partner APIs ---

// Part 1: Registration Approval Check (Simulated for now)
app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(404).send("User not found");
    if (partner.status !== 'Active') return res.status(403).send("Waiting for Admin Approval");
    res.json(partner);
});

// Part 2: Assessment Search
app.post('/api/partner/assessment', async (req, res) => {
    const { country, degree, languageType } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (languageType) query.languageType = languageType;
    
    const results = await University.find(query);
    res.json(results);
});

// Part 2 & 3: File Opening & Auto-Wallet Update
app.post('/api/partner/open-file', async (req, res) => {
    try {
        const { partnerId, studentName, studentContact, uniName, commission } = req.body;
        
        // 1. Create Student File
        const newFile = new StudentFile({ partnerId, studentName, studentContact, universityName: uniName, commissionAmount: commission });
        await newFile.save();

        // 2. Auto Update Partner Wallet
        await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });

        res.json({ success: true, message: "File Opened & Commission Added!" });
    } catch (e) { res.status(500).send("Error"); }
});

// Part 3: Fetch Tracking Data
app.get('/api/partner/my-files/:id', async (req, res) => {
    const files = await StudentFile.find({ partnerId: req.params.id }).sort({ createdAt: -1 });
    res.json(files);
});

app.listen(10000, () => console.log("Partner System Live"));