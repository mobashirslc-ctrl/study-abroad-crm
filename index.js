const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error(err));

// --- Schemas ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, degree: String,
    intake: String, semesterFee: Number, languageType: String,
    langScore: Number, minGPA: Number, spouseAllowed: String,
    partnerCommission: Number, scholarship: String
});
const University = mongoose.model('University', universitySchema);

const withdrawSchema = new mongoose.Schema({
    partnerName: String, amount: Number, method: String, accountDetails: String, status: { type: String, default: 'Pending' }
});
const Withdraw = mongoose.model('Withdraw', withdrawSchema);

const studentFileSchema = new mongoose.Schema({
    partnerName: String, studentName: String, universityName: String, course: String, status: { type: String, default: 'Pending' },
    documents: { passport: String, academic: String }
});
const StudentFile = mongoose.model('StudentFile', studentFileSchema);

// --- API Routes ---

// অ্যাডমিন থেকে ইউনিভার্সিটি অ্যাড
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "Added Successfully" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// পার্টনার পোর্টালের জন্য সার্চ
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { country, gpa, langScore } = req.body;
        let query = {};
        if (country) query.country = { $regex: new RegExp(country, 'i') };
        if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
        if (langScore) query.langScore = { $lte: parseFloat(langScore) };
        const results = await University.find(query);
        res.json({ success: true, data: results });
    } catch (err) { res.status(500).json({ success: false }); }
});

// উইথড্র এবং ফাইল রিকোয়েস্ট (আগের লজিক)
app.post('/api/partner/withdraw', async (req, res) => { await (new Withdraw(req.body)).save(); res.json({success:true}); });
app.post('/api/partner/upload-file', async (req, res) => { await (new StudentFile(req.body)).save(); res.json({success:true}); });

// অ্যাডমিন প্যানেলের ডেটা
app.get('/api/admin/withdraws', async (req, res) => res.json(await Withdraw.find().sort({_id:-1})));
app.get('/api/admin/files', async (req, res) => res.json(await StudentFile.find().sort({_id:-1})));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 IHP Engine on ${PORT}`));