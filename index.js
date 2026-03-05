const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0")
.then(() => console.log('✅ DB Connected'))
.catch(err => console.error('❌ DB Error:', err));

const universitySchema = new mongoose.Schema({
    name: String, location: String, country: String, course: String,
    degree: String, intake: String, minGPA: Number, languageType: String,
    minLanguageScore: Number, semesterFee: Number, currency: String,
    maritalStatus: String, partnerCommission: Number, bankAmount: Number, accountType: String
}, { strict: false });

const University = mongoose.model('University', universitySchema);

// Admin API
app.post('/api/universities', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.status(201).json({ success: true, message: "Added!" });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Partner Search API (Advanced Filter)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, country, degree, language } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i');
        if (degree) query.degree = degree;
        if (language) query.languageType = language;
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));