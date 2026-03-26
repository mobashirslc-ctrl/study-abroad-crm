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
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ DB Error:', err.message));

// --- 👤 Models ---
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String,
    logoURL: String
});
const User = mongoose.model('User', userSchema);

const applicationSchema = new mongoose.Schema({
    studentName: String,
    passportNo: String,
    partnerEmail: String,
    university: String,
    commissionBDT: Number,
    pdf1: String, pdf2: String, pdf3: String, pdf4: String,
    status: { type: String, default: 'PENDING' },
    complianceMember: String,
    pendingAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});
const Application = mongoose.model('Application', applicationSchema);

// --- University Schema Updated ---
const universitySchema = new mongoose.Schema({
    universityName: String, 
    country: String, 
    courseName: String,
    degree: String,
    semesterFee: Number, 
    partnerComm: Number, 
    minGPA: String,
    ieltsReq: String,
    gap: String,
    timestamp: { type: Date, default: Date.now }
});
const University = mongoose.model('University', universitySchema);

const withdrawalSchema = new mongoose.Schema({
    partnerEmail: String, amount: Number, method: String, details: String,
    status: { type: String, default: 'PENDING' },
    timestamp: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// --- 🚀 API Routes ---

// Auth
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ fullName, email: email.toLowerCase().trim(), password: hashedPassword });
        await user.save();
        res.status(201).json({ msg: 'Success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ msg: 'Invalid' });
    res.json({ user: { email: user.email, name: user.fullName, role: user.role, logoURL: user.logoURL } });
});

// Partner Actions
app.get('/api/applications', async (req, res) => {
    const apps = await Application.find().sort({ timestamp: -1 });
    res.json(apps);
});

app.post('/api/submit-application', async (req, res) => {
    const newApp = new Application(req.body);
    await newApp.save();
    res.status(201).json({ msg: 'Submitted' });
});

// --- 🏛️ University API Routes (Admin & Partner) ---
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
        res.status(201).json({ msg: 'University Added Successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/delete-university/:id', async (req, res) => {
    try {
        await University.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Deleted Successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Withdrawal Requests
app.post('/api/withdrawals', async (req, res) => {
    const wd = new Withdrawal(req.body);
    await wd.save();
    res.status(201).json({ msg: 'Requested' });
});

// Profile Update
app.patch('/api/update-profile', async (req, res) => {
    const { email, contact, logoURL } = req.body;
    await User.findOneAndUpdate({ email }, { $set: { contact, logoURL } });
    res.json({ msg: 'Updated' });
});

// Frontend Routing - Keep this at the END
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
