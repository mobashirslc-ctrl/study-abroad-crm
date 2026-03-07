const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// ১. পাথ রেজোলিউশন (Render-এ ব্ল্যাঙ্ক পেজ এড়াতে এটি জরুরি)
const __root = path.resolve();

// ২. মিডলওয়্যার সেটআপ
app.use(express.json());
// নিশ্চিত করুন আপনার সব HTML/CSS ফাইল 'public' ফোল্ডারের ভেতর আছে
app.use(express.static(path.join(__root, 'public')));

// ৩. ডাটাবেস মডেল (১৮টি ফিল্ড সহ)
const universitySchema = new mongoose.Schema({
    country: String,
    name: String,
    location: String,
    courses: String,
    degree: { type: String, enum: ['UG', 'PG', 'DIPLOMA', 'PHD', 'RESEARCH'] },
    semesterFee: Number,
    currency: { type: String, enum: ['USD', 'AUD', 'EUR', 'BDT', 'CAD', 'GBP'] },
    languageRequired: { type: String, enum: ['IELTS', 'PTE', 'DUOLINGO'] },
    minLanguageScore: String,
    minGPA: String,
    intake: String,
    scholarship: String,
    partnerCommission: Number,
    bankName: String,
    loanAmount: Number,
    bankAmountRequired: Number,
    bankType: { type: String, enum: ['FDR', 'Savings'] },
    maritalCondition: { type: String, enum: ['Single', 'With Spouse'] }
});

const University = mongoose.model('University', universitySchema);

// ৪. ফিক্সড রাউট (আপনার পোর্টালগুলোর জন্য)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__root, 'public', 'admin.html'));
});

app.get('/partner', (req, res) => {
    res.sendFile(path.join(__root, 'public', 'partner.html'));
});

app.get('/compliance', (req, res) => {
    res.sendFile(path.join(__root, 'public', 'compliance.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__root, 'public', 'student.html'));
});

// ৫. API এন্ডপয়েন্ট
// ইউনিভার্সিটি ডাটা সেভ করার জন্য
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "University Added!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ইউনিভার্সিটি ডাটা পার্টনার পোর্টালে দেখানোর জন্য
app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৬. ডাটাবেস কানেকশন (আপনার ইউজারনেম ও পাসওয়ার্ড সহ)
const DB_USER = "IHPCRM"; 
const DB_PASS = "ihp2026";
const cluster_url = "cluster0.8qewhkr.mongodb.net";

const dbURI = `mongodb+srv://${DB_USER}:${DB_PASS}@${cluster_url}/?retryWrites=true&w=majority&appName=Cluster0`;

const PORT = process.env.PORT || 3000;

mongoose.connect(dbURI)
    .then(() => {
        console.log("🔥 Connected to MongoDB Cloud Successfully as IHPCRM!");
        app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
    })
    .catch(err => {
        console.log("❌ Database Connection Error: ", err);
    });