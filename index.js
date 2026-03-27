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

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return; 
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully to MongoDB');
    } catch (err) {
        console.error('❌ DB Error:', err.message);
        throw err;
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
    logoUrl: String,
    walletBalance: { type: Number, default: 0 }
}, { collection: 'users' }));

const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({
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
    handledBy: String, 
    lockBy: { type: String, default: null }, 
    lockUntil: { type: Date, default: null }, 
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: String,
    country: String,
    courseName: String,
    degree: String,
    semesterFee: Number,
    partnerComm: Number,
    minGPA: Number,   
    ieltsReq: Number, 
    gap: Number       
}, { collection: 'universities' }));

// --- 🚀 API Routes ---

// ১. প্রোফাইল আপডেট
app.patch('/api/user/profile', async (req, res) => {
    await connectDB();
    try {
        const { email, contact, orgName, authorisedPerson, address, logoUrl } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { contact, orgName, authorisedPerson, address, logoUrl },
            { new: true }
        );
        res.json(updatedUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ২. সিঙ্গেল অ্যাপ্লিকেশন ডিটেইলস (আইডি চেকসহ)
app.get('/api/applications/:id', async (req, res) => {
    await connectDB();
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID Format" });
        }
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "No student found with this ID" });
        res.json(appData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৩. অ্যাপ্লিকেশন লকিং রুট
app.patch('/api/lock-application/:id', async (req, res) => {
    await connectDB();
    try {
        const { staffEmail } = req.body;
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Application not found" });

        if (appData.lockBy && appData.lockBy !== staffEmail && appData.lockUntil > new Date()) {
            return res.status(403).json({ locked: true, message: `Locked by ${appData.lockBy}` });
        }

        const lockTime = new Date(Date.now() + 5 * 60000); 
        await Application.findByIdAndUpdate(req.params.id, { lockBy: staffEmail, lockUntil: lockTime });
        res.json({ locked: false, message: "Lock acquired" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৪. কমপ্লায়েন্স আপডেট
// ৪. কমপ্লায়েন্স আপডেট (index.js ফাইলে গিয়ে এটি পরিবর্তন করুন)
app.patch('/api/update-compliance', async (req, res) => {
    await connectDB(); 
    try {
        const { appId, status, complianceNote, staffEmail, commission } = req.body;
        
        let updateData = { 
            status, complianceNote, complianceMember: staffEmail,
            lockBy: null, lockUntil: null, timestamp: new Date()
        };

        // এই লাইনটিই আসল পরিবর্তন:
        // ৪. কমপ্লায়েন্স আপডেট - সংশোধিত ভার্সন
if (status === 'VERIFIED' || status === 'DOCS_VERIFIED' || status === 'DOC_VERIFIED') {
    updateData.pendingAmount = Number(commission) || 0;
} else {
    // অন্য যেকোনো স্ট্যাটাসে (যেমন: PENDING, MISSING_DOCS) টাকা ০ থাকবে
    updateData.pendingAmount = 0;
}


        const updatedApp = await Application.findByIdAndUpdate(appId, { $set: updateData }, { new: true });
        res.json({ msg: `Updated successfully to ${status}`, data: updatedApp });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৫. সব অ্যাপ্লিকেশন লিস্ট
app.get('/api/applications', async (req, res) => {
    await connectDB();
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৬. সব ইউনিভার্সিটি লিস্ট
app.get('/api/universities', async (req, res) => {
    await connectDB();
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ⭐ নতুন রুট: স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট ---
app.post('/api/submit-application', async (req, res) => {
    await connectDB();
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ msg: "Application saved successfully", data: newApp });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ৭. লগইন রুট
app.post('/api/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        res.json({ user: { 
            email: user.email, 
            name: user.fullName, 
            role: user.role,
            orgName: user.orgName, 
            logoUrl: user.logoUrl 
        }});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;
