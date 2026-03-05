const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ১. ডাটাবেস কানেকশন (এখানে আপনার নিজের MongoDB URI বসাবেন)
mongoose.connect('your_mongodb_connection_string_here')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ Connection Error:', err));

// ২. ইউনিভার্সিটি মডেল
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

// ৩. নতুন ইউনিভার্সিটি অ্যাড করার API (Admin)
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ৪. এলিজিবিলিটি চেক এবং সার্চ API (Dashboard)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, languageScore, country, degree, languageType } = req.body;
        let query = {};

        if (country) query.country = country;
        if (degree) query.degree = degree;
        if (languageType) query.languageType = languageType;

        // নম্বরগুলো নির্ভুলভাবে চেক করা (যাতে ৫00 Error না আসে)
        const userGPA = parseFloat(gpa) || 0;
        const userScore = parseFloat(languageScore) || 0;

        query.minGPA = { $lte: userGPA };
        query.minLanguageScore = { $lte: userScore };

        const universities = await University.find(query);
        res.json({ success: true, data: universities });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ success: false, message: "Server encountered an error." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));