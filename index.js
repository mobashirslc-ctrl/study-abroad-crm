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
// আপনার স্ক্রিনশট অনুযায়ী crm_db ডাটাবেসটি ব্যবহার করা হয়েছে
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected successfully to MongoDB (crm_db) via GORUN'))
    .catch(err => console.error('❌ DB Error:', err.message));

// --- 👤 Models (Strictly using crm_db collections) ---
const User = mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String,
    logoURL: String
}, { collection: 'users' }));

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

// 1. Auth: Registration
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ 
            fullName, 
            email: email.toLowerCase().trim(), 
            password: hashedPassword 
        });
        await user.save();
        res.status(201).json({ msg: 'Registration Successful' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Auth: Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(401).json({ msg: 'User not found' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: 'Invalid Credentials' });
        
        res.json({ 
            user: { email: user.email, name: user.fullName, role: user.role, logoURL: user.logoURL } 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Applications: Get All
app.get('/api/applications', async (req, res) => {
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Applications: Submit New
app.post('/api/submit-application', async (req, res) => {
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ msg: 'Application Submitted Successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Compliance: Lock Application for Review
app.patch('/api/lock-application', async (req, res) => {
    try {
        const { appId, staff } = req.body;
        const appData = await Application.findById(appId);
        if (!appData) return res.status(404).json({ msg: "Not found" });

        if (appData.status === 'UNDER_REVIEW' && appData.complianceMember !== staff) {
            return res.status(403).json({ msg: "Already being reviewed by " + appData.complianceMember });
        }

        appData.status = 'UNDER_REVIEW';
        appData.complianceMember = staff;
        await appData.save();
        res.json({ msg: "Locked for review", data: appData });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Compliance: Update Decision (Approve/Reject)
app.patch('/api/update-compliance', async (req, res) => {
    try {
        const { appId, status, note, staff } = req.body;
        const appData = await Application.findById(appId);
        if (!appData) return res.status(404).json({ msg: "File not found" });

        appData.status = status;
        appData.complianceNote = note;
        appData.complianceMember = staff;
        // ভেরিফাইড হলে কমিশন পেন্ডিংয়ে যোগ হবে
        appData.pendingAmount = (status === 'VERIFIED') ? (appData.commissionBDT || 0) : 0;

        await appData.save();
        res.json({ msg: `Application ${status} successfully` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Universities: List & Add
app.get('/api/universities', async (req, res) => {
    try {
        const unis = await University.find().sort({ timestamp: -1 });
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).json({ msg: 'University Added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. Withdrawals: Request
app.post('/api/withdrawals', async (req, res) => {
    try {
        const wd = new Withdrawal(req.body);
        await wd.save();
        res.status(201).json({ msg: 'Withdrawal Requested' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 🌐 Frontend Routing ---
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Export for Vercel
module.exports = app;

// Listen locally (Development only)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}
