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

// --- 🗄️ MongoDB Connection ---
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ Connected successfully to crm_db'))
.catch(err => console.error('❌ DB Error:', err.message));

// --- 👤 Models ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String
}, { collection: 'users' }));

const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({
    studentName: String, passportNo: String, partnerEmail: String, university: String,
    commissionBDT: Number, pdf1: String, pdf2: String, pdf3: String, pdf4: String,
    status: { type: String, default: 'PENDING' }, complianceMember: String, 
    complianceNote: String, pendingAmount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: String, country: String, courseName: String, degree: String,
    semesterFee: Number, partnerComm: Number, minGPA: String, ieltsReq: String, gap: String
}, { collection: 'universities' }));

// --- 🚀 API Routes ---

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ msg: "Missing fields" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ fullName, email: email.toLowerCase().trim(), password: hashedPassword });
        await user.save();
        res.status(201).json({ msg: 'Success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ msg: 'Invalid Credentials' });
        res.json({ user: { email: user.email, name: user.fullName, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/applications', async (req, res) => {
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
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
        res.json({ msg: `Updated to ${status}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/universities', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

module.exports = app;
