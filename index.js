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

// --- 🗄️ MongoDB Connection Utility (Serverless Friendly) ---
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
    contact: String
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
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: String, country: String, courseName: String, degree: String,
    semesterFee: Number, partnerComm: Number, minGPA: String, ieltsReq: String, gap: String
}, { collection: 'universities' }));

// --- 🚀 API Routes ---

/**
 * ১. নতুন অ্যাপ্লিকেশন সাবমিট রুট (প্রয়োজনীয় রুট)
 * পার্টনার পোর্টাল থেকে আসা স্টুডেন্ট ডাটা এবং পিডিএফ লিঙ্ক সেভ করে।
 */
app.post('/api/submit-application', async (req, res) => {
    await connectDB();
    try {
        const newApp = new Application(req.body);
        const savedApp = await newApp.save();
        res.status(201).json({ msg: 'Application Saved Successfully', data: savedApp });
    } catch (e) {
        console.error("Submission Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ২. অ্যাপ্লিকেশন আপডেট / রিভিউ সেভ রুট
app.patch('/api/update-compliance', async (req, res) => {
    await connectDB(); 
    try {
        const { appId, status, note, staff } = req.body;
        
        let update = { 
            status: status, 
            complianceNote: note, 
            complianceMember: staff,
            handledBy: staff 
        };

        if (status === 'DOC_VERIFIED' || status === 'VERIFIED') {
            const appData = await Application.findById(appId);
            if (appData) {
                update.pendingAmount = appData.commissionBDT || 0;
            }
        }

        const updatedApp = await Application.findByIdAndUpdate(appId, update, { new: true });
        
        if(!updatedApp) return res.status(404).json({ error: "Application not found" });
        
        res.json({ msg: `Updated successfully to ${status}`, data: updatedApp });
    } catch (e) { 
        console.error("Update Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// ৩. সকল অ্যাপ্লিকেশন রিট্রিভ
app.get('/api/applications', async (req, res) => {
    await connectDB();
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৪. ইউনিভার্সিটি লিস্ট
app.get('/api/universities', async (req, res) => {
    await connectDB();
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৫. লগইন রুট
app.post('/api/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        res.json({ user: { email: user.email, name: user.fullName, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;
