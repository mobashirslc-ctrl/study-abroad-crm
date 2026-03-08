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
    status: { type: String, default: 'Pending' }, 
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

// ১. রেজিস্ট্রেশন (পেন্ডিং থাকবে)
app.post('/api/auth/register', async (req, res) => {
    const newPartner = new Partner(req.body);
    await newPartner.save();
    res.json({ success: true, message: "Registration Successful! Admin approval required to login." });
});

// ২. লগইন (অ্যাক্টিভ না হলে ব্লক)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "Invalid Credentials!" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Your account is still Pending Approval!" });
    res.json({ success: true, user });
});

// ৩. স্মার্ট অ্যাসেসমেন্ট (সব ফিল্ড সার্চ)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ 
        country: new RegExp(country, 'i'), 
        degree: degree, 
        language: language 
    });
    res.json(results);
});

// ৪. ফাইল ট্র্যাকিং গেট API
app.get('/api/partner/files', async (req, res) => {
    const files = await FileTrack.find().sort({openDate: -1});
    res.json(files);
});

// ড্যাশবোর্ড রাউটিং
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Live on ${PORT}`));