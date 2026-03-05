const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ DB Connection Error:', err.message));

// Updated Schema with Bank Info
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
    semesterFee: Number,
    currency: String,
    maritalStatus: String,
    partnerCommission: Number,
    bankAmount: Number,         // নতুন ফিল্ড
    accountType: String         // নতুন ফিল্ড (FDR/Savings)
}, { strict: false });

const University = mongoose.model('University', universitySchema);

// API: Add University
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// API: Partner Search (Eligibility)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, country, degree } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i'); // Case-insensitive search
        if (degree) query.degree = degree;
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));