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

const publicPath = path.join(__dirname, 'public'); 
app.use(express.static(publicPath));

// --- 🌐 Database Connection ---
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return; 
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully to MongoDB');
    } catch (err) {
        console.error('❌ DB Error:', err.message);
    }
};

// --- 👤 Models ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String,
    orgName: String,
    authorisedPerson: String,
    address: String,
    nidPdf: String,
    tradeLicensePdf: String,
    expertCountries: String,
    experience: String,
    website: String,
    status: { type: String, default: 'pending' }, 
    expiryDate: { type: Date, default: null },   
    walletBalance: { type: Number, default: 0 },
    logoUrl: String
}, { collection: 'users' }));

const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({
    studentName: String, 
    passportNo: String, 
    partnerEmail: String, 
    university: String,
    commissionBDT: Number, 
    status: { type: String, default: 'PENDING' }, 
    complianceMember: String, 
    complianceNote: String, 
    pendingAmount: { type: Number, default: 0 },
    lockBy: { type: String, default: null }, 
    lockUntil: { type: Date, default: null }, 
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({
    partnerEmail: { type: String, required: true },
    partnerName: String,
    amount: { type: Number, required: true },
    method: { type: String, default: 'Bank/Mobile Finance' },
    status: { type: String, default: 'PENDING' },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'withdrawals' }));

const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: String, country: String, location: String, degree: String,
    duration: String, semesterFee: Number, livingCost: Number,
    jobOpportunity: String, partnerComm: Number, minGPA: Number, ieltsReq: Number, gap: Number
}, { collection: 'universities' }));

// --- 🚀 API Routes ---

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'auth.html')));
app.get('/track', (req, res) => res.sendFile(path.join(publicPath, 'track.html')));

// 1. Registration
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    try {
        await connectDB();
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email/Password missing" });
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) return res.status(400).json({ message: "Email exists" });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ ...req.body, email: cleanEmail, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ success: true, message: "Registered! Wait for approval." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Login
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
    try {
        await connectDB();
        const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ msg: 'Invalid Credentials' });
        if (user.status === 'pending') return res.status(403).json({ msg: 'Account Pending Approval' });
        res.json({ user });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Admin: Update Wallet & Application Status
app.patch('/api/applications/:id', async (req, res) => {
    try {
        await connectDB();
        const amount = Number(req.body.pendingAmount) || 0; 
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Not found" });

        const updatedApp = await Application.findByIdAndUpdate(req.params.id, 
            { $inc: { pendingAmount: -amount }, status: req.body.status || 'PAID' }, { new: true });

        if (amount > 0) {
            await User.findOneAndUpdate({ email: appData.partnerEmail.toLowerCase().trim() }, { $inc: { walletBalance: amount } });
        }
        res.json({ msg: `Success! ${amount} added.`, data: updatedApp });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Compliance: Update Status and Commission
app.patch('/api/update-compliance', async (req, res) => {
    try {
        await connectDB(); 
        const { appId, status, complianceNote, staffEmail, commission } = req.body;
        let pAmount = (status.includes('VERIFIED')) ? (Number(commission) || 0) : 0;
        const updatedApp = await Application.findByIdAndUpdate(appId, { 
            status, complianceNote, complianceMember: staffEmail, pendingAmount: pAmount,
            lockBy: null, lockUntil: null, timestamp: new Date()
        }, { new: true });
        res.json({ msg: `Updated to ${status}`, data: updatedApp });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Public Tracking
app.get('/api/track-status', async (req, res) => {
    try {
        await connectDB();
        const appData = await Application.findOne({ passportNo: { $regex: new RegExp(req.query.passportNo, "i") } });
        if (!appData) return res.status(404).json({ message: "No record found" });
        res.json({ studentName: appData.studentName, status: appData.status, university: appData.university });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Other APIs
app.get('/api/applications', async (req, res) => {
    try { await connectDB(); const apps = await Application.find().sort({ timestamp: -1 }); res.json(apps); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'auth.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await connectDB();
    console.log(`🚀 IHP CRM is Live on Port ${PORT}`);
});

module.exports = app;