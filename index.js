const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ DB Connected')).catch(err => console.log(err));

// --- Schemas ---

const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, course: String, degree: String,
    intake: String, minGPA: Number, languageType: String, minLanguageScore: Number,
    semesterFee: Number, partnerCommission: Number, maritalStatus: String,
    bankAmount: Number, accountType: String, currency: { type: String, default: 'BDT' }
});

const applicationSchema = new mongoose.Schema({
    partnerName: String,
    studentName: String,
    universityName: String, 
    commission: Number,
    status: { type: String, default: 'Pending' },
    complianceOfficer: {
        name: { type: String, default: 'Asif Rahman' }, // Default member
        phone: { type: String, default: '+88017XXXXXXXX' },
        email: { type: String, default: 'compliance@stepup.com' }
    },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}, { timestamps: true }); // এটি অটোমেটিক createdAt (Submission Date/Time) তৈরি করবে

const University = mongoose.model('University', universitySchema);
const Application = mongoose.model('Application', applicationSchema);

// --- API Endpoints ---

// ১. এডমিন থেকে ইউনিভার্সিটি অ্যাড
app.post('/api/universities', async (req, res) => {
    const uni = new University(req.body);
    await uni.save();
    res.json({ success: true });
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

// ৪. পার্টনারের সব ফাইল দেখা (Submission Time সহ)
app.get('/api/applications/:name', async (req, res) => {
    const apps = await Application.find({ partnerName: req.params.name }).sort({ createdAt: -1 });
    res.json(apps);
});

// ৫. কমিউনিকেশন মেসেজ পাঠানো
app.post('/api/applications/message', async (req, res) => {
    const { appId, message, sender } = req.body;
    await Application.findByIdAndUpdate(appId, { 
        $push: { messages: { sender: sender, text: message } } 
    });
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));