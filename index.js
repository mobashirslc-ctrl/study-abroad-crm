const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error(err));

// University Schema
const universitySchema = new mongoose.Schema({
    name: String,
    country: String,
    location: String,
    degree: String,
    partnerCommission: Number,
    scholarship: String,
    minGPA: Number,
    minLanguageScore: Number
});

const University = mongoose.model('University', universitySchema);

// --- API Endpoints ---

// অ্যাডমিন প্যানেল থেকে ইউনিভার্সিটি অ্যাড করার রুট
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).json({ success: true, message: "University added successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// পার্টনার পোর্টালের জন্য সার্চ রুট
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { country, gpa } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i');
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));