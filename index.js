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
    universityName: String,
    country: String,
    courseName: String,
    degree: String,
    semesterFee: Number,
    partnerComm: Number,
    minGPA: Number,   // String থেকে Number করা হয়েছে (গাণিতিক তুলনার জন্য)
    ieltsReq: Number, // Language Score (Number)
    gap: Number       // Study Gap Years (Number)
}, { collection: 'universities' }));

// --- 🚀 API Routes ---

/**
 * ১. একটি নির্দিষ্ট অ্যাপ্লিকেশনের ডিটেইলস দেখা (নতুন যোগ করা হয়েছে)
 * এটি না থাকলে রিভিউ মোডাল ওপেন হবে না।
 */
app.get('/api/applications/:id', async (req, res) => {
    await connectDB();
    try {
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Not found" });
        res.json(appData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * ২. অ্যাপ্লিকেশন আপডেট / রিভিউ সেভ রুট (সংশোধিত)
 * ফ্রন্টএন্ডের Payload এর সাথে মিলিয়ে আপডেট করা হয়েছে।
 */
app.patch('/api/update-compliance', async (req, res) => {
    await connectDB(); 
    try {
        const { appId, status, complianceNote, staffEmail, commission } = req.body;
        
        let updateData = { 
            status: status, 
            complianceNote: complianceNote, 
            complianceMember: staffEmail, // ফ্রন্টএন্ড থেকে আসা staffEmail সেভ হবে
            timestamp: new Date()
        };

        // যদি ভেরিফাইড হয়, তবে পেন্ডিং এমাউন্টে কমিশন যোগ হবে
        if (status === 'VERIFIED') {
            updateData.pendingAmount = commission || 0;
        } else if (status === 'REJECTED') {
            updateData.pendingAmount = 0;
        }

        const updatedApp = await Application.findByIdAndUpdate(
            appId, 
            { $set: updateData }, 
            { new: true }
        );
        
        if(!updatedApp) return res.status(404).json({ error: "Application not found" });
        
        res.json({ msg: `Updated successfully to ${status}`, data: updatedApp });
    } catch (e) { 
        console.error("Update Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

/**
 * ৩. সকল অ্যাপ্লিকেশন রিট্রিভ (সব ঠিক আছে)
 */
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
