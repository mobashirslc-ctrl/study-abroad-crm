const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Connected')).catch(err => console.log(err));

// Schemas
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, course: String, 
    degree: String, intake: String, minGPA: Number, 
    languageType: String, minLanguageScore: Number,
    semesterFee: Number, partnerCommission: Number,
    scholarship: String
});

const applicationSchema = new mongoose.Schema({
    partnerName: String, studentName: String, universityName: String, 
    commission: Number, status: { type: String, default: 'Pending' },
    complianceOfficer: { name: { type: String, default: 'IHP Support' }, phone: { type: String, default: '+880' } }
}, { timestamps: true });

const University = mongoose.model('University', universitySchema);
const Application = mongoose.model('Application', applicationSchema);

// --- API Endpoints ---

// ১. সার্চ লজিক (স্মার্ট ফিল্টার)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { country, degree, language, langScore, gpa } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i');
        if (degree) query.degree = degree;
        if (language) query.languageType = language;
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
        if (langScore) query.minLanguageScore = { $lte: parseFloat(langScore) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ২. স্যাম্পল ডেটা ইনজেকশন (যদি সার্চে কিছু না আসে, এটি একবার রান করবেন)
app.get('/api/inject-sample', async (req, res) => {
    await University.deleteMany({}); // আগের সব মুছে ফেলবে
    await University.create([
        { name: "University of Sydney", country: "Australia", location: "Sydney", course: "IT", degree: "UG", intake: "July 2026", minGPA: 3.0, languageType: "IELTS", minLanguageScore: 6.0, semesterFee: 500000, partnerCommission: 25000, scholarship: "20% Discount" },
        { name: "Oxford University", country: "UK", location: "London", course: "Business", degree: "PG", intake: "Sep 2026", minGPA: 3.5, languageType: "PTE", minLanguageScore: 65, semesterFee: 800000, partnerCommission: 40000, scholarship: "Available" }
    ]);
    res.send("Sample Data Added! Now try searching with GPA 4.0 and Score 7.0");
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
app.listen(PORT, () => console.log(`🚀 IHP CRM running` ));