const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Connected'));

// --- Schemas ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, degree: String,
    intake: String, semesterFee: Number, languageType: String,
    langScore: Number, minGPA: Number, spouseAllowed: String,
    partnerCommission: Number, scholarship: String
});

const partnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true },
    subscriptionStatus: { type: String, default: 'Active' },
    subscriptionAmount: { type: Number, default: 0 },
    subscriptionType: String
});

const University = mongoose.model('University', universitySchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- Admin Routes ---
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

app.post('/api/admin/update-subscription', async (req, res) => {
    const { id, status, amount } = req.body;
    await Partner.findByIdAndUpdate(id, { subscriptionStatus: status, subscriptionAmount: amount });
    res.json({ success: true });
});

// --- Partner Routes ---
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));