const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Master System Live'));

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
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date },
    withdrawEnabled: { type: Boolean, default: false }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    complianceMember: { name: String, contact: String },
    partnerId: mongoose.Schema.Types.ObjectId,
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ১. অটো ব্লক চেক (Middleware)
const checkStatus = async (req, res, next) => {
    const user = await Partner.findById(req.headers.userid);
    if (!user || user.status !== 'Active') return res.json({ success: false, message: "Account Blocked/Pending!" });
    if (user.subscription.expireDate < new Date()) return res.json({ success: false, message: "Subscription Expired!" });
    next();
};

// ২. কমপ্লায়েন্স অ্যাকশন: কমিশন রিলিজ
app.post('/api/compliance/release', async (req, res) => {
    const { partnerId, fileId } = req.body;
    await Partner.findByIdAndUpdate(partnerId, { withdrawEnabled: true });
    await FileTrack.findByIdAndUpdate(fileId, { status: 'Commission Active' });
    res.json({ success: true });
});

// ৩. ইউনিভার্সিটি সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    res.json(await University.find({ country: new RegExp(country, 'i'), degree, language }));
});

// ৪. অ্যাডমিন: অল ডাটা কন্ট্রোল
app.get('/api/admin/all-partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/admin/add-uni', async (req, res) => { await new University(req.body).save(); res.json({success:true}); });

// Routing
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/compliance', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compliance.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on ${PORT}`));