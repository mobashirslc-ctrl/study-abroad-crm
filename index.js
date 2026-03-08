const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ CRM Master Connected'));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, 
    status: { type: String, default: 'Pending' }, // রেজিস্ট্রেশন করলে পেন্ডিং থাকবে
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0}, withdrawn: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ১. রেজিস্ট্রেশন (পেন্ডিং লজিক)
app.post('/api/auth/register', async (req, res) => {
    const existing = await Partner.findOne({ email: req.body.email });
    if (existing) return res.json({ success: false, message: "Email already exists!" });
    const newPartner = new Partner(req.body);
    await newPartner.save();
    res.json({ success: true, message: "Registration Successful! Waiting for Admin Approval." });
});

// ২. লগইন (অ্যাপ্রুভাল চেক)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "Invalid Credentials!" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account Pending Approval. Please contact Admin." });
    res.json({ success: true, user });
});

// ৩. স্মার্ট অ্যাসেসমেন্ট সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, language });
    res.json(results);
});

// ৪. অ্যাডমিন: পার্টনার স্ট্যাটাস আপডেট (Active/Deactivate)
app.post('/api/admin/update-partner', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status });
    res.json({ success: true });
});

// ৫. অ্যাডমিন: ইউনিভার্সিটি অ্যাড (All Fields)
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// Routing
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on port ${PORT}`));