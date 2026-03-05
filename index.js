const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 document uploads

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Connected')).catch(err => console.error(err));

// --- Schemas ---

// University Schema
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, degree: String,
    intake: String, semesterFee: Number, languageType: String,
    langScore: Number, minGPA: Number, spouseAllowed: String,
    partnerCommission: Number, scholarship: String
});

// Partner Schema
const partnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true },
    subscriptionStatus: { type: String, default: 'Active' },
    wallet: { totalEarnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 } }
});

// Withdraw Request Schema
const withdrawSchema = new mongoose.Schema({
    partnerName: String, amount: Number, method: String, 
    accountDetails: String, status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

// Student Application Schema
const studentFileSchema = new mongoose.Schema({
    partnerName: String, studentName: String, universityName: String,
    course: String, status: { type: String, default: 'Pending' },
    documents: { passport: String, academic: String, ielts: String },
    createdAt: { type: Date, default: Date.now }
});

const University = mongoose.model('University', universitySchema);
const Partner = mongoose.model('Partner', partnerSchema);
const Withdraw = mongoose.model('Withdraw', withdrawSchema);
const StudentFile = mongoose.model('StudentFile', studentFileSchema);

// --- API Routes ---

// 1. Search University (Fixed Logic)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { country, degree, languageType, langScore, gpa } = req.body;
        let query = {};
        if (country) query.country = { $regex: new RegExp(country, 'i') };
        if (degree) query.degree = degree;
        if (languageType) query.languageType = languageType;
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
        if (langScore) query.langScore = { $lte: parseFloat(langScore) };

        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 2. Admin: Add University
app.post('/api/admin/add-university', async (req, res) => {
    const uni = new University(req.body);
    await uni.save();
    res.json({ success: true });
});

// 3. Partner: Withdraw Request
app.post('/api/partner/withdraw', async (req, res) => {
    const request = new Withdraw(req.body);
    await request.save();
    res.json({ success: true });
});

// 4. Partner: Upload Student File
app.post('/api/partner/upload-file', async (req, res) => {
    const newFile = new StudentFile(req.body);
    await newFile.save();
    res.json({ success: true });
});

// 5. Admin: Get All Data
app.get('/api/admin/withdraws', async (req, res) => res.json(await Withdraw.find().sort({createdAt:-1})));
app.get('/api/admin/files', async (req, res) => res.json(await StudentFile.find().sort({createdAt:-1})));

app.post('/api/admin/update-status', async (req, res) => {
    const { id, type, status } = req.body;
    if(type === 'withdraw') await Withdraw.findByIdAndUpdate(id, { status });
    else await StudentFile.findByIdAndUpdate(id, { status });
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Engine running on ${PORT}`));