const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ১. ডাটাবেস কানেকশন (আপনার নিজের MongoDB URI ব্যবহার করুন)
mongoose.connect('আপনার_MONGODB_URI_এখানে_বসান')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// ২. ইউনিভার্সিটি মডেল (নতুন ফিল্ডসহ)
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

// ৩. ইউনিভার্সিটি অ্যাড করার রাউট (Admin)
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ৪. সার্চ এবং এলিজিবিলিটি চেক রাউট (Dashboard)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, languageType, languageScore, country, degree, intake } = req.body;
        let query = {};

        // ফিল্টারিং লজিক
        if (country) query.country = country;
        if (degree) query.degree = degree;
        if (intake) query.intake = { $regex: intake, $options: 'i' };
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
        if (languageType) query.languageType = languageType;
        if (languageScore) query.minLanguageScore = { $lte: parseFloat(languageScore) };

        const universities = await University.find(query);
        res.json({ success: true, data: universities });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ৫. সার্ভার পোর্ট
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));