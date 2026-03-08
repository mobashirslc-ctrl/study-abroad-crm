const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ CRM System Connected'));

// --- SCHEMAS ---

// ইউনিভার্সিটি (আপনার সব ফিল্ড এখানে আছে)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// পার্টনার (উইথড্র ও সাবস্ক্রিপশন সহ)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String, email: String, pass: String,
    status: { type: String, default: 'Pending' }, // Pending/Active/Deactivate
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ফাইল ট্র্যাকিং
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'File Opened' },
    complianceMember: { name: String, org: String },
    visaStatus: { type: String, default: 'Pending' },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ১. পার্টনার ব্লক/অ্যাক্টিভ লজিক (রিয়েল টাইম ফিক্স)
app.post('/api/admin/partner-status', async (req, res) => {
    const { id, status } = req.body;
    await Partner.findByIdAndUpdate(id, { status: status });
    res.json({ success: true });
});

// ২. ইউনিভার্সিটি অ্যাড (সব ফিল্ড)
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// ৩. স্মার্ট অ্যাসেসমেন্ট সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ 
        country: new RegExp(country, 'i'),
        degree: degree,
        language: language
    });
    res.json(results);
});

// ৪. পার্টনার লগইন (অ্যাপ্রুভাল চেক)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account Pending/Blocked by Admin" });
    res.json({ success: true, user });
});

// ৫. ডাটা গেট APIs
app.get('/api/admin/all-partners', async (req, res) => res.json(await Partner.find()));
app.get('/api/admin/all-files', async (req, res) => res.json(await FileTrack.find().sort({openDate:-1})));

// --- ROUTES ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));