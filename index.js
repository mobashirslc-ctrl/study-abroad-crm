const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ১. MongoDB Connection (Timeout ফিক্সসহ)
const mongoURI = "আপনার_মঙ্গোডিবি_কানেকশন_স্ট্রিং_এখানে_দিন"; 

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000 // ১০ সেকেন্ড পর্যন্ত কানেকশন ট্রাই করবে
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ২. ইউনিভার্সিটি স্কিমা (সব ফিল্ড নাম্বার এবং স্ট্রিং টাইপ অনুযায়ী সেট করা)
const universitySchema = new mongoose.Schema({
    name: String,
    location: String,
    country: String,
    course: String,
    degree: String,
    intake: String,
    minGPA: Number,
    languageType: String,
    minLanguageScore: Number,
    commissionAmount: Number
}, { strict: false }); // অতিরিক্ত কোনো ডেটা থাকলে যাতে এরর না দেয়

const University = mongoose.model('University', universitySchema);

// ৩. API: নতুন ইউনিভার্সিটি অ্যাড করা
app.post('/api/universities', async (req, res) => {
    try {
        console.log("Incoming Data:", req.body); // চেক করার জন্য লগে ডেটা দেখা
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added successfully!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: "Invalid Data Structure: " + err.message });
    }
});

// ৪. API: ইউনিভার্সিটি সার্চ করা (Dashboard এর জন্য)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, languageScore, country, degree } = req.body;
        let query = {};
        if (country) query.country = country;
        if (degree) query.degree = degree;
        
        // এলিজিবিলিটি লজিক
        query.minGPA = { $lte: parseFloat(gpa) || 5.0 };
        query.minLanguageScore = { $lte: parseFloat(languageScore) || 100 };

        const universities = await University.find(query);
        res.json({ success: true, data: universities });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));