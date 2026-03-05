const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ CRM Engine Connected')).catch(err => console.log(err));

// --- Schemas ---

// ইউনিভার্সিটি ডেটাবেস
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, course: String, degree: String,
    intake: String, minGPA: Number, languageType: String, minLanguageScore: Number,
    semesterFee: Number, partnerCommission: Number, maritalStatus: String,
    bankAmount: Number, accountType: String, currency: { type: String, default: 'BDT' }
});

// স্টুডেন্ট অ্যাপ্লিকেশন ও ট্র্যাকিং
const applicationSchema = new mongoose.Schema({
    partnerName: String,
    studentName: String,
    universityName: String, 
    commission: Number,
    status: { type: String, default: 'Pending' }, // Pending, Under Review, Offer Issued, Success
    paymentStatus: { type: String, default: 'Unpaid' }, // Unpaid, Withdrawable, Paid
    complianceOfficer: {
        name: { type: String, default: 'Assigning...' },
        phone: { type: String, default: 'N/A' }
    },
    remarks: [String]
}, { timestamps: true });

const University = mongoose.model('University', universitySchema);
const Application = mongoose.model('Application', applicationSchema);

// --- API Endpoints ---

// ১. এডমিন থেকে ইউনিভার্সিটি অ্যাড
app.post('/api/universities', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ২. পার্টনার এলিজিবিলিটি চেক (সার্চ)
app.post('/api/check-eligibility', async (req, res) => {
    const { gpa, country, degree, language, langScore, maritalStatus } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (language) query.languageType = language;
    if (maritalStatus) query.maritalStatus = maritalStatus;
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
    if (langScore) query.minLanguageScore = { $lte: parseFloat(langScore) };

    const results = await University.find(query);
    res.json({ success: true, data: results });
});

// ৩. নতুন ফাইল ওপেন করা
app.post('/api/applications', async (req, res) => {
    const appData = new Application(req.body);
    await appData.save();
    res.json({ success: true });
});

// ৪. পার্টনারের সব ফাইল ট্র্যাকিং করা
app.get('/api/applications/:name', async (req, res) => {
    const apps = await Application.find({ partnerName: req.params.name }).sort({ createdAt: -1 });
    res.json(apps);
});

// ৫. মেসেজ পাঠানো (Communication)
app.post('/api/applications/message', async (req, res) => {
    const { appId, message } = req.body;
    await Application.findByIdAndUpdate(appId, { $push: { remarks: `Partner: ${message}` } });
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));