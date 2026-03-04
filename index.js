const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://ADMIN:Gorun2026@cluster0.8qewhkr.mongodb.net/StudyAbroadCRM")
    .then(() => console.log("Database Connected"))
    .catch(err => console.log(err));

const UniversitySchema = new mongoose.Schema({
    name: String, country: String, location: String,
    courseName: String, degreeLevel: String, // UG, PG, Diploma, PhD, Research
    currency: String, tutionFee: Number, scholarship: String,
    minGPA: Number, minCGPA: Number, maxStudyGap: Number,
    requiredBankAmount: Number, bankType: String,
    languageType: String, minLangScore: Number,
    maritalStatus: String
});
const University = mongoose.model('University', UniversitySchema);

app.get('/api/universities', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

app.post('/api/universities', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ message: "Saved!" });
});

app.delete('/api/universities/:id', async (req, res) => {
    await University.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted!" });
});

app.listen(process.env.PORT || 10000);