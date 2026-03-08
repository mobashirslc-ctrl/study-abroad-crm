const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // File download/upload er jonno
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB'));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String,
    intake: String, degree: String, language: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankNameSuggestion: String,
    loanAmount: String, maritalStatus: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, orgName: String, contact: String,
    status: { type: String, default: 'Pending' }, // Active/Deactivate
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'Pending' },
    pdfUrl: String, // Downloadable link
    complianceInfo: { name: String, org: String, id: String },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// 1. Partner Auth
app.post('/api/partner/register', async (req, res) => {
    const newPartner = new Partner(req.body);
    await newPartner.save();
    res.json({ success: true, message: "Registration successful. Wait for Admin approval." });
});

app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email, pass: req.body.pass, status: 'Active' });
    if (partner) res.json({ success: true, partner });
    else res.json({ success: false, message: "Invalid login or Account not active." });
});

// 2. Admin: Get/Approve Partners
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/admin/approve-partner', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: 'Active' });
    res.json({ success: true });
});

// 3. File Tracking with PDF Simulation
app.post('/api/open-file', async (req, res) => {
    const data = { ...req.body, pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }; 
    const newFile = new FileTrack(data);
    await newFile.save();
    res.json({ success: true });
});

app.get('/api/admin/files', async (req, res) => res.json(await FileTrack.find().sort({openTime: -1})));

// 4. University Search
app.get('/api/search-uni', async (req, res) => {
    const results = await University.find({ 
        country: new RegExp(`^${req.query.country}$`, 'i'), 
        degree: req.query.degree 
    });
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));