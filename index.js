const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Engine Connected'));

// --- University Schema ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, degree: String,
    intake: String, semesterFee: Number, languageType: String,
    langScore: Number, minGPA: Number, spouseAllowed: String,
    partnerCommission: Number, scholarship: String
});

// --- Partner Schema ---
const partnerSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    subscriptionStatus: { type: String, default: 'Active' },
    subscriptionType: String, // Basic, Standard, Premium
    wallet: { totalEarnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 } }
});

const University = mongoose.model('University', universitySchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- ROUTES ---

// ১. ইউনিভার্সিটি অ্যাড করা (Admin)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ২. ইউনিভার্সিটি সার্চ (Partner) - Fixes "Searching..." issue
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { country, degree, languageType, langScore, gpa } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i');
        if (degree) query.degree = degree;
        if (languageType) query.languageType = languageType;
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
        if (langScore) query.langScore = { $lte: parseFloat(langScore) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ৩. পার্টনার রেজিস্ট্রেশন (Subscription সহ)
app.post('/api/partner/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: "Email already exists" }); }
});

// ৪. পার্টনার লিস্ট (Admin Dashboard)
app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));