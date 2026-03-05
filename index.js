const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Engine Connected')).catch(err => console.log(err));

// University Schema (Updated with Scholarship & Advanced Fields)
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, course: String, 
    degree: { type: String, enum: ['UG', 'PG', 'Diploma', 'PhD', 'Research'] },
    intake: String, minGPA: Number, 
    languageType: { type: String, enum: ['IELTS', 'PTE', 'Duolingo'] },
    minLanguageScore: Number,
    semesterFee: Number, partnerCommission: Number,
    scholarship: { type: String, default: "No Scholarship" }, // Added for IHP CRM
    maritalStatus: String
});

const applicationSchema = new mongoose.Schema({
    partnerName: String, studentName: String, universityName: String, 
    commission: Number, status: { type: String, default: 'Pending' },
    complianceOfficer: { name: { type: String, default: 'IHP Support' }, phone: { type: String, default: '+880' } }
}, { timestamps: true });

const University = mongoose.model('University', universitySchema);
const Application = mongoose.model('Application', applicationSchema);

// API: Eligibility Search (Enhanced Filter)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, degree, language, langScore, gpa } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (language) query.languageType = language;
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
    if (langScore) query.minLanguageScore = { $lte: parseFloat(langScore) };

    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.post('/api/applications', async (req, res) => {
    const appData = new Application(req.body);
    await appData.save();
    res.json({ success: true });
});

app.get('/api/applications/:name', async (req, res) => {
    const apps = await Application.find({ partnerName: req.params.name }).sort({ createdAt: -1 });
    res.json(apps);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 IHP CRM on Port ${PORT}`));