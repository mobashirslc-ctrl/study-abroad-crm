const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// ১. ডাটাবেস কানেকশন (Timeout অপশনসহ)
const mongoURI = "আপনার_কানেকশন_স্ট্রিং_এখানে_বসান";
mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000 // ৫ সেকেন্ডের বেশি সময় নিলে এরর দেবে
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ২. ইউনিভার্সিটি মডেল
const University = mongoose.model('University', new mongoose.Schema({
    name: String, country: String, location: String, course: String,
    degree: String, intake: String, minGPA: Number, 
    languageType: String, minLanguageScore: Number, commissionAmount: Number
}));

// ৩. ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: err.message });
    }
});

// ৪. সার্চ API
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
        res.status(500).json({ success: false, message: "Search failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));