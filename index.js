const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0");

// ১. ইউনিভার্সিটি মডেল
const universitySchema = new mongoose.Schema({
    name: String, country: String, course: String, degree: String,
    semesterFee: Number, partnerCommission: Number, intake: String,
    minGPA: Number, languageType: String, minLanguageScore: Number
}, { strict: false });
const University = mongoose.model('University', universitySchema);

// ২. স্টুডেন্ট অ্যাপ্লিকেশন মডেল (Existing Files)
const applicationSchema = new mongoose.Schema({
    partnerId: String,
    studentName: String,
    universityName: String,
    status: { type: String, default: 'Pending' }, // Pending, Approved, Collected, Paid
    commissionAmount: Number,
    paymentStatus: { type: String, default: 'Unpaid' } // Unpaid, Requested, Withdrawn
}, { timestamps: true });
const Application = mongoose.model('Application', applicationSchema);

// ৩. সাবস্ক্রিপশন কনফিগ (Admin customise করতে পারবে)
let subConfig = { monthlyFee: 5000, currency: 'BDT' };

// --- API Endpoints ---

// সাবস্ক্রিপশন আপডেট (Admin Only)
app.post('/api/admin/config-sub', (req, res) => {
    subConfig.monthlyFee = req.body.fee;
    res.json({ success: true, currentFee: subConfig.monthlyFee });
});

// অ্যাপ্লিকেশন সাবমিট করা
app.post('/api/applications', async (req, res) => {
    const appData = new Application(req.body);
    await appData.save();
    res.json({ success: true });
});

// পার্টনারের সব ফাইল দেখা
app.get('/api/partner/files/:id', async (req, res) => {
    const files = await Application.find({ partnerId: req.params.id });
    res.json(files);
});

// ওয়ালেট লজিক: উইথড্র রিকোয়েস্ট
app.post('/api/partner/withdraw', async (req, res) => {
    const { partnerId, amount } = req.body;
    // এখানে আপনার ডেটাবেসে উইথড্রাল রিকোয়েস্ট সেভ করার লজিক হবে
    res.json({ success: true, message: "Withdrawal request sent to admin" });
});

// সার্চ লজিক (আগের মতোই)
app.post('/api/check-eligibility', async (req, res) => {
    const { gpa, country, degree, language, langScore } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.listen(10000, () => console.log("🚀 CRM Server running on 10000"));