const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to Master Database'));

// --- SCHEMAS ---

// ১. ইউনিভার্সিটি (সব রিকোয়ার্ড ফিল্ড সহ)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. পার্টনার (উইথড্র ও সাবস্ক্রিপশন লজিক)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String, email: String, pass: String,
    status: { type: String, default: 'Pending' },
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0}, withdrawn: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ৩. স্টুডেন্ট ফাইল ট্র্যাকিং
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'File Opened' },
    visaStatus: { type: String, default: 'Pending' },
    complianceMember: { name: String, id: String },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// ৪. উইথড্র রিকোয়েস্ট
const WithdrawSchema = new mongoose.Schema({
    partnerEmail: String, amount: Number, method: String, account: String, status: { type: String, default: 'Pending' }
});
const Withdraw = mongoose.model('Withdraw', WithdrawSchema);

// --- APIs ---

// ফাইল ওপেনিং (Fix: Now responds correctly)
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true, message: "File Opened Successfully" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// উইথড্র রিকোয়েস্ট (Fix: Now responds correctly)
app.post('/api/withdraw-request', async (req, res) => {
    try {
        const request = new Withdraw(req.body);
        await request.save();
        res.json({ success: true, message: "Withdraw Request Sent" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// অ্যাডমিন: ইউনিভার্সিটি অ্যাড
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// অ্যাসেসমেন্ট সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, language });
    res.json(results);
});

// পার্টনার লগইন (Status Check)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (user && user.status === 'Active') res.json({ success: true, user });
    else res.json({ success: false, message: "Account Inactive or Invalid" });
});

app.get('/api/admin/files', async (req, res) => res.json(await FileTrack.find().sort({openDate:-1})));

// --- ROUTES ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));