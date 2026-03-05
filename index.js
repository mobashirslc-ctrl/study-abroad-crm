const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// আপনার MongoDB URI এখানে দিন
mongoose.connect('your_mongodb_uri_here')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error(err));

// ইউনিভার্সিটি মডেল - সব ফিল্ড অপশনাল করে দেয়া হলো যাতে 400 Error না আসে
const University = mongoose.model('University', new mongoose.Schema({
    name: String,
    country: String,
    location: String,
    intake: String,
    course: String,
    degree: String,
    minGPA: Number,
    languageType: String,
    minLanguageScore: Number,
    commissionAmount: Number
}));

// অ্যাডমিন রাউট
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Invalid Data Structure" });
    }
});

// এলিজিবিলিটি রাউট
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, languageScore, country, degree } = req.body;
        let query = {};
        if (country) query.country = country;
        if (degree) query.degree = degree;
        
        query.minGPA = { $lte: parseFloat(gpa) || 5.0 };
        query.minLanguageScore = { $lte: parseFloat(languageScore) || 100 };

        const universities = await University.find(query);
        res.json({ success: true, data: universities });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));