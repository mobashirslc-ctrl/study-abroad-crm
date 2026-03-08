const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Master Database Connected'));

// --- SCHEMAS ---

const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, status: { type: String, default: 'Pending' },
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0}, withdrawn: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'File Opened' },
    visaStatus: { type: String, default: 'Pending' },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// রেজিস্ট্রেশন (পেন্ডিং)
app.post('/api/auth/register', async (req, res) => {
    const p = new Partner(req.body);
    await p.save();
    res.json({ success: true, message: "Registration Successful! Status: Pending Approval." });
});

// লগইন (অ্যাক্টিভ চেক)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "Invalid Credentials" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account Pending Admin Approval!" });
    res.json({ success: true, user });
});

// স্মার্ট অ্যাসেসমেন্ট সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, language });
    res.json(results);
});

// ফাইল ওপেনিং
app.post('/api/open-file', async (req, res) => {
    const f = new FileTrack(req.body);
    await f.save();
    res.json({ success: true, message: "Student File Processed" });
});

// ফাইল লিস্ট (ট্র্যাকিং)
app.get('/api/all-files', async (req, res) => res.json(await FileTrack.find().sort({openDate: -1})));

// অ্যাডমিন: ইউনিভার্সিটি অ্যাড
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// Routing (Cannot GET Error সমাধান)
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));