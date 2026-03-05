const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection String
// আপনার প্রোভাইড করা ক্রেডেনশিয়াল অনুযায়ী কানেকশন স্ট্রিং
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB Atlas Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// University Schema (আপনার সব ফিল্ড এখানে অন্তর্ভুক্ত)
const universitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: String,
    country: String,
    course: String,
    degree: String,
    intake: String,
    minGPA: Number,
    languageType: String,      // IELTS, PTE, Duolingo etc.
    minLanguageScore: Number,  // মিনিমাম রিকোয়ার্ড স্কোর
    semesterFee: Number,
    currency: String,          // GBP, USD, CAD etc.
    maritalStatus: String,
    partnerCommission: Number,
    bankAmount: Number,        // Bank Solvency amount
    accountType: String        // Savings or FDR
}, { 
    strict: false, 
    timestamps: true 
});

const University = mongoose.model('University', universitySchema);

// ---------------------------------------------------------
// ১. API: নতুন ইউনিভার্সিটি অ্যাড করা (Admin Panel এর জন্য)
// ---------------------------------------------------------
app.post('/api/universities', async (req, res) => {
    try {
        console.log("Incoming Data:", req.body); // ডিবাগিংয়ের জন্য লগ
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ 
            success: true, 
            message: "University added successfully to database!" 
        });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ 
            success: false, 
            message: "Failed to save data: " + err.message 
        });
    }
});

// ---------------------------------------------------------
// ২. API: এলিজিবিলিটি চেক এবং সার্চ (Partner Portal এর জন্য)
// ---------------------------------------------------------
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, country, degree, language, langScore } = req.body;
        
        // ডাইনামিক কুয়েরি অবজেক্ট
        let query = {};

        // দেশ অনুযায়ী ফিল্টার (Case-insensitive)
        if (country) {
            query.country = new RegExp(country, 'i');
        }

        // ডিগ্রি অনুযায়ী ফিল্টার
        if (degree) {
            query.degree = degree;
        }

        // ল্যাঙ্গুয়েজ টাইপ অনুযায়ী ফিল্টার (IELTS/PTE/Duolingo)
        if (language) {
            query.languageType = language;
        }

        // GPA লজিক: স্টুডেন্টের GPA অবশ্যই ইউনিভার্সিটির minGPA এর সমান বা বেশি হতে হবে
        if (gpa) {
            query.minGPA = { $lte: parseFloat(gpa) };
        }

        // ল্যাঙ্গুয়েজ স্কোর লজিক: স্টুডেন্টের স্কোর অবশ্যই ইউনিভার্সিটির মিনিমাম স্কোরের সমান বা বেশি হতে হবে
        if (langScore) {
            query.minLanguageScore = { $lte: parseFloat(langScore) };
        }

        const results = await University.find(query).sort({ createdAt: -1 });
        
        res.json({ 
            success: true, 
            count: results.length,
            data: results 
        });

    } catch (err) {
        console.error("Search Error:", err.message);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error during search" 
        });
    }
});

// ---------------------------------------------------------
// ৩. API: হেলথ চেক (সার্ভার চলছে কি না দেখার জন্য)
// ---------------------------------------------------------
app.get('/', (req, res) => {
    res.send('Study Abroad CRM Server is Running... 🚀');
});

// সার্ভার পোর্ট সেটআপ
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});