const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// ১. পাথ এবং মিডলওয়্যার সেটআপ
const __root = path.resolve();
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));

// ২. ডাটাবেস মডেল (University & User)

// University Assessment Schema
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

// User Schema (Role Based with Status)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'partner', 'compliance', 'student'], required: true },
    status: { type: String, default: 'pending' }, // নতুন ইউজাররা ডিফল্ট পেন্ডিং থাকবে
    walletBalance: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// ৩. পার্মানেন্ট রাউট (URL Links)
app.get('/', (req, res) => res.sendFile(path.join(__root, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__root, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__root, 'public', 'partner.html')));
app.get('/compliance', (req, res) => res.sendFile(path.join(__root, 'public', 'compliance.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__root, 'public', 'student.html')));

// ৪. অথেন্টিকেশন এপিআই (Login/Register)

// Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "Registration successful! Wait for Admin approval." });
    } catch (err) {
        res.status(400).json({ success: false, error: "Registration failed. Email might already exist." });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        
        // অ্যাডমিন ছাড়া অন্যদের জন্য স্ট্যাটাস চেক
        if (user.role !== 'admin' && user.status !== 'active') {
            return res.status(403).json({ success: false, message: "Your account is pending or inactive. Contact Admin." });
        }

        res.json({ success: true, role: user.role, name: user.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৫. ডাটা ম্যানেজমেন্ট এপিআই

// ইউনিভার্সিটি অ্যাড করা (Admin Only)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// সব ইউনিভার্সিটি লিস্ট (Partner Search)
app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ইউজার লিস্ট দেখা (অ্যাডমিনের জন্য)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // পাসওয়ার্ড ছাড়া সব ডাটা
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ইউজার স্ট্যাটাস পরিবর্তন (অ্যাডমিন একটিভ/ইনএকটিভ করবে)
app.post('/api/admin/update-user-status', async (req, res) => {
    try {
        const { userId, status } = req.body;
        await User.findByIdAndUpdate(userId, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ৬. ডাটাবেস কানেকশন
const DB_USER = "IHPCRM"; 
const DB_PASS = "ihp2026";
const dbURI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const PORT = process.env.PORT || 3000;
mongoose.connect(dbURI)
    .then(() => {
        console.log("🔥 Connected to MongoDB Cloud Successfully!");
        app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
    })
    .catch(err => console.log("❌ DB Error: ", err));