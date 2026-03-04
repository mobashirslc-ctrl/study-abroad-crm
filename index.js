const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ADMIN:Gorun2026@cluster0.8qewhkr.mongodb.net/StudyAbroadCRM?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("OK: Connected to Atlas"))
    .catch(err => console.error(err));

// Updated University Schema
const UniversitySchema = new mongoose.Schema({
    name: String,
    country: String,
    courseName: String,
    intake: String,
    tutionFee: String,
    minGPA: Number,
    minCGPA: Number,
    maxStudyGap: Number,
    requiredBankAmount: Number,
    bankType: String, // FDR or Savings
    languageType: String, // IELTS/PTE/Duolingo/GRE
    minLangScore: Number
});
const University = mongoose.model('University', UniversitySchema);

// Routes
app.post('/api/universities', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).json({ message: "Saved Successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/universities', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));