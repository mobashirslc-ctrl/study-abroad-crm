const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ------------------------------------------------------------------
// 1. DATABASE MODELS (১৮টি অ্যাসেসমেন্ট ফিল্ড এবং ইউজার রোল)
// ------------------------------------------------------------------

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

// User Schema (Admin, Partner, Compliance, Student)
const userSchema = new mongoose.Schema({
    role: { type: String, enum: ['admin', 'team-admin', 'partner', 'compliance', 'student'] },
    name: String,
    email: { type: String, unique: true },
    password: String,
    status: { type: String, default: 'pending' }, 
    walletBalance: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// ------------------------------------------------------------------
// 2. FIXED PERMANENT LINKS (আপনার রিকোয়ারমেন্ট অনুযায়ী)
// ------------------------------------------------------------------

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/compliance', (req, res) => res.sendFile(path.join(__dirname, 'public/compliance.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public/student.html')));
app.get('/team-admin', (req, res) => res.sendFile(path.join(__dirname, 'public/team-admin.html')));

// ------------------------------------------------------------------
// 3. API ENDPOINTS
// ------------------------------------------------------------------

// ইউনিভার্সিটি অ্যাড করা (Admin Dashboard)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true, message: "University added successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ইউনিভার্সিটি সার্চ করা (Partner Portal)
app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ------------------------------------------------------------------
// 4. DATABASE CONNECTION (IHPCRM ইউজারনেম সহ)
// ------------------------------------------------------------------

const DB_USER = "IHPCRM"; 
const DB_PASS = "ihp2026";
const cluster_url = "cluster0.8qewhkr.mongodb.net";

// MongoDB Atlas Connection String
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