const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 🗄️ MongoDB Connection ---
// সরাসরি কানেকশন স্ট্রিং-এ ডাটাবেস নাম (StudyAbroadCRM) যোগ করা হয়েছে
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/StudyAbroadCRM?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected successfully to StudyAbroadCRM via GORUN'))
    .catch(err => console.error('❌ DB Error:', err.message));

// --- 👤 Models ---
const User = mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String,
    logoURL: String
}, { collection: 'users' })); // Collection name nishchit kora holo

const Application = mongoose.model('Application', new mongoose.Schema({
    studentName: String,
    passportNo: String,
    partnerEmail: String,
    university: String,
    commissionBDT: Number,
    pdf1: String, pdf2: String, pdf3: String, pdf4: String,
    status: { type: String, default: 'PENDING' },
    complianceMember: String,
    complianceNote: String,
    pendingAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const University = mongoose.model('University', new mongoose.Schema({
    universityName: String, country: String, courseName: String, degree: String,
    semesterFee: Number, partnerComm: Number, minGPA: String, ieltsReq: String, gap: String,
    timestamp: { type: Date, default: Date.now }
}, { collection: 'universities' }));

const Withdrawal = mongoose.model('Withdrawal', new mongoose.Schema({
    partnerEmail: String, amount: Number, method: String, details: String,
    status: { type: String, default: 'PENDING' },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'withdrawals' }));

// --- 🚀 API Routes ---

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ msg: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: 'Invalid Credentials' });
        
        res.json({ user: { email: user.email, name: user.fullName, role: user.role, logoURL: user.logoURL } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Applications API
app.get('/api/applications', async (req, res) => {
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Submit Application API
app.post('/api/submit-application', async (req, res) => {
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ msg: 'Submitted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Other routes (Lock, Update, Uni, etc.)
app.patch('/api/lock-application', async (req, res) => {
    try {
        const { appId, staff } = req.body;
        await Application.findByIdAndUpdate(appId, { status: 'UNDER_REVIEW', complianceMember: staff });
        res.json({ msg: "Locked" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/update-compliance', async (req, res) => {
    try {
        const { appId, status, note, staff } = req.body;
        const update = { status, complianceNote: note, complianceMember: staff };
        if (status === 'VERIFIED') {
            const app = await Application.findById(appId);
            update.pendingAmount = app.commissionBDT || 0;
        }
        await Application.findByIdAndUpdate(appId, update);
        res.json({ msg: "Updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Frontend Routing
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Vercel Export
module.exports = app;
