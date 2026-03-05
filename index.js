const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// স্ট্যাটিক ফাইল সার্ভ করার জন্য (যাতে partner.html এবং admin.html সরাসরি পাওয়া যায়)
app.use(express.static(path.join(__dirname, './')));

// MongoDB Connection (আপনার দেওয়া কানেকশন স্ট্রিং)
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority";
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Database Schemas ---

// পার্টনার স্কিমা (স্ট্যাটাস এবং সাবস্ক্রিপশন সহ)
const PartnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: String,
    status: { type: String, default: 'Active' },
    subAmount: { type: Number, default: 500 },
    earnings: { type: Number, default: 0 },
    withdrawn: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ইউনিভার্সিটি/অ্যাসেসমেন্ট স্কিমা
const UniversitySchema = new mongoose.Schema({
    name: String,
    country: String,
    degree: String,
    intake: String,
    semesterFee: String,
    bankReq: String,
    langScore: Number,
    academicScore: Number,
    partnerCommission: Number
});
const University = mongoose.model('University', UniversitySchema);

// উইথড্র রিকোয়েস্ট স্কিমা
const WithdrawSchema = new mongoose.Schema({
    partnerName: String,
    amount: Number,
    method: String,
    account: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const Withdraw = mongoose.model('Withdraw', WithdrawSchema);

// --- Serving HTML Files (Route Fix) ---

app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'partner.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API Routes ---

// ১. ইউনিভার্সিটি অ্যাড করা (Admin)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ২. পার্টনার লিস্ট দেখা (Admin)
app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

// ৩. পার্টনার স্ট্যাটাস টগল করা (Admin)
app.post('/api/admin/update-partner-status', async (req, res) => {
    const { id, status } = req.body;
    await Partner.findByIdAndUpdate(id, { status });
    res.json({ success: true });
});

// ৪. এলিজিবিলিটি চেক/সার্চ (Partner)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, langScore, academicScore } = req.body;
    let query = {};
    
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (degree) query.degree = degree;
    // লজিক: মিনিমাম রিকোয়ারমেন্ট এর চেয়ে বেশি বা সমান স্কোর থাকলে দেখাবে
    if (langScore) query.langScore = { $lte: parseFloat(langScore) };
    if (academicScore) query.academicScore = { $lte: parseFloat(academicScore) };

    try {
        const data = await University.find(query);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৫. উইথড্র রিকোয়েস্ট সাবমিট করা (Partner)
app.post('/api/partner/withdraw', async (req, res) => {
    try {
        const newRequest = new Withdraw(req.body);
        await newRequest.save();
        res.json({ success: true, message: "Withdrawal request sent!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at: https://study-abroad-crm.onrender.com`);
    console.log(`📂 Admin: /admin | Partner: /partner`);
});