const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ CRM Master Database Active'));

// --- SCHEMAS ---

// ১. ইউনিভার্সিটি (সব ফিল্ড সহ)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. পার্টনার (উইথড্র ও সাবস্ক্রিপশন সহ)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String, email: String, pass: String,
    status: { type: String, default: 'Pending' },
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date, isBlocked: Boolean }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ৩. ফাইল ট্র্যাকিং (কমপ্লায়েন্স ও ভিসা স্ট্যাটাস সহ)
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'File Opened' },
    visaStatus: { type: String, default: 'Pending' },
    complianceMember: { name: String, contact: String, org: String },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// রেজিস্ট্রেশন ও লগইন
app.post('/api/register', async (req, res) => {
    const partner = new Partner(req.body);
    await partner.save();
    res.json({ success: true, message: "Registration Pending" });
});

app.post('/api/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (user && user.status === 'Active') res.json({ success: true, user });
    else res.json({ success: false, message: "Account Inactive/Not Found" });
});

// স্মার্ট অ্যাসেসমেন্ট
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, language });
    res.json(results);
});

// ফাইল ওপেনিং (Response Fixed)
app.post('/api/open-file', async (req, res) => {
    const newFile = new FileTrack(req.body);
    await newFile.save();
    res.json({ success: true, message: "Student File Processed Successfully" });
});

// অ্যাডমিন কন্ট্রোল
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

app.get('/api/all-partners', async (req, res) => res.json(await Partner.find()));
app.get('/api/all-files', async (req, res) => res.json(await FileTrack.find().sort({openDate:-1})));

// Server Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on port ${PORT}`));