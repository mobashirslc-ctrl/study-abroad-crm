const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority")
    .then(() => console.log('✅ IHP CRM Database Connected'))
    .catch((err) => console.error('❌ Connection Error:', err));

// --- Database Schemas ---

const UniversitySchema = new mongoose.Schema({
    name: String,
    country: String,
    degree: String,
    intake: String,
    semesterFee: String,
    currency: String,
    languageType: String,
    langScore: Number,
    academicScore: Number,
    partnerCommission: Number,
    bankReq: String // Screen-এ দেখা যাওয়া Bank Req. ফিল্ডের জন্য
});

const PartnerSchema = new mongoose.Schema({
    name: String,
    email: String,
    status: { type: String, default: 'Active' },
    subAmount: { type: Number, default: 500 }, // Custom Subscription Option
    earnings: { type: Number, default: 0 },
    withdrawn: { type: Number, default: 0 }
});

const WithdrawSchema = new mongoose.Schema({
    partnerName: String,
    amount: Number,
    method: String,
    account: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});

const StudentFileSchema = new mongoose.Schema({
    studentName: String,
    university: String,
    partnerName: String,
    status: { type: String, default: 'In Review' },
    date: { type: Date, default: Date.now }
});

// Models
const University = mongoose.model('University', UniversitySchema);
const Partner = mongoose.model('Partner', PartnerSchema);
const Withdraw = mongoose.model('Withdraw', WithdrawSchema);
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// --- Admin Routes ---

// ১. ইউনিভার্সিটি অ্যাড করা (Assessment Data)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true, message: "University added successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ২. সব স্টুডেন্ট ফাইল দেখা (Tracking)
app.get('/api/admin/all-files', async (req, res) => {
    const files = await StudentFile.find().sort({ _id: -1 });
    res.json(files);
});

// ৩. পার্টনার লিস্ট দেখা
app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

// ৪. পার্টনার স্ট্যাটাস টগল করা (Active/Inactive) - FIXED
app.post('/api/admin/update-partner-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        const updated = await Partner.findByIdAndUpdate(id, { status: status }, { new: true });
        if (updated) res.json({ success: true, status: updated.status });
        else res.status(404).json({ success: false, message: "Partner not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৫. সাবস্ক্রিপশন কাস্টমাইজ করা
app.post('/api/admin/custom-sub', async (req, res) => {
    const { id, amount } = req.body;
    try {
        await Partner.findByIdAndUpdate(id, { subAmount: amount });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ৬. সব উইথড্র রিকোয়েস্ট দেখা
app.get('/api/admin/withdrawals', async (req, res) => {
    const requests = await Withdraw.find().sort({ _id: -1 });
    res.json(requests);
});

// --- Partner Portal Routes ---

// ১. এলিজিবিলিটি চেক (Assessment)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, languageType, langScore, academicScore } = req.body;
    let query = {};
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree && degree !== "Select Degree") query.degree = degree;
    if (languageType) query.languageType = languageType;
    if (langScore) query.langScore = { $lte: parseFloat(langScore) };
    if (academicScore) query.academicScore = { $lte: parseFloat(academicScore) };

    try {
        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ২. উইথড্র রিকোয়েস্ট পাঠানো
app.post('/api/partner/withdraw', async (req, res) => {
    try {
        const newRequest = new Withdraw(req.body);
        await newRequest.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Server Listen
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 CRM Server is running on port ${PORT}`);
});