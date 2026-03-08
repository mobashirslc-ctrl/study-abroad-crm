const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
    .then(() => console.log('✅ CRM Master Connected to MongoDB'))
    .catch(err => console.error('❌ Connection Error:', err));

// --- Models ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, contact: String, 
    status: { type: String, default: 'Pending' }, // Active / Deactivate
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0}, withdrawn: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date },
    withdrawEnabled: { type: Boolean, default: false }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String,
    status: { type: String, default: 'File Opened' },
    complianceMember: { name: {type: String, default: 'Unassigned'}, contact: String },
    partnerId: mongoose.Schema.Types.ObjectId,
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ১. সাবস্ক্রিপশন অটো-ব্লক চেক (Middleware)
const checkPartnerAccess = async (req, res, next) => {
    const partner = await Partner.findById(req.headers.partnerid);
    if (!partner) return res.status(403).json({ success: false, message: "Partner not found" });
    if (partner.status !== 'Active') return res.status(403).json({ success: false, message: "Account is Pending/Deactivated" });
    
    // Auto-block if expired
    if (new Date(partner.subscription.expireDate) < new Date()) {
        return res.status(403).json({ success: false, message: "Subscription Expired!" });
    }
    next();
};

// ২. অ্যাডমিন: পার্টনার ম্যানেজমেন্ট
app.get('/api/admin/partners', async (req, res) => {
    res.json(await Partner.find());
});

app.post('/api/admin/partner-control', async (req, res) => {
    const { id, status, subPackage, subDays } = req.body;
    let expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + parseInt(subDays));
    
    await Partner.findByIdAndUpdate(id, { 
        status: status, 
        'subscription.package': subPackage, 
        'subscription.expireDate': expireDate 
    });
    res.json({ success: true });
});

// ৩. অ্যাডমিন: ইউনিভার্সিটি অ্যাড (আপনার সব ফিল্ড সহ)
app.post('/api/admin/add-uni', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "University Added!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ৪. পার্টনার: স্মার্ট অ্যাসেসমেন্ট (উইথ ফিল্টার)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const query = {};
    if(country) query.country = new RegExp(country, 'i');
    if(degree && degree !== 'Degree') query.degree = degree;
    if(language && language !== 'Language') query.language = language;
    
    const results = await University.find(query);
    res.json(results);
});

// ৫. কমপ্লায়েন্স: কমিশন রিলিজ
app.post('/api/compliance/release', async (req, res) => {
    const { partnerId, fileId, compName, compContact } = req.body;
    // পার্টনারের উইথড্র অপশন খুলে দেওয়া
    await Partner.findByIdAndUpdate(partnerId, { withdrawEnabled: true });
    // ফাইল স্ট্যাটাস আপডেট
    await FileTrack.findByIdAndUpdate(fileId, { 
        status: 'Commission Active',
        'complianceMember.name': compName,
        'complianceMember.contact': compContact
    });
    res.json({ success: true });
});

// ৬. রেজিস্ট্রেশন এপিআই
app.post('/api/auth/register', async (req, res) => {
    const partner = new Partner(req.body);
    await partner.save();
    res.json({ success: true, message: "Registration successful. Wait for Admin Approval." });
});

const PORT = 10000;
app.listen(PORT, () => console.log(`🚀 CRM Live: http://localhost:${PORT}`));