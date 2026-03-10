const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public')); // static ফাইল সার্ভ করার জন্য

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, courseName: String, degreeType: String,
    intake: String, semesterFee: String, partnerCommission: Number,
    bankNameBD: String, loanAmount: String, maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const StudentFileSchema = new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, 
    passportNo: String, degree: String, gpa: String, langScore: String,
    uniName: String, commission: Number,
    status: { type: String, default: 'Pending' }, 
    complianceStatus: { type: String, default: 'File Received' },
    date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// --- ROUTES FOR HTML PAGES (Fixes "Cannot GET" Error) ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

// --- AUTH API ---
app.post('/api/partner/register', async (req, res) => {
    try { const p = new Partner(req.body); await p.save(); res.json({msg: "Registration Successful. Wait for Admin Approval."}); } 
    catch(e) { res.status(400).json({msg: "Email already exists"}); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({email: req.body.email, pass: req.body.pass});
    if(!p) return res.status(401).json({msg: "Invalid Email or Password"});
    if(p.status !== 'Active') return res.status(403).json({msg: "Account Inactive. Contact Admin for Approval."});
    res.json({id: p._id, name: p.name});
});

// --- PARTNER STATS & WALLET ---
app.get('/api/partner/stats/:id', async (req, res) => {
    const files = await StudentFile.find({ partnerId: req.params.id }).sort({date: -1});
    const pending = files.filter(f => f.status === 'Pending').reduce((acc, curr) => acc + curr.commission, 0);
    const partner = await Partner.findById(req.params.id);
    res.json({ pending, fixed: partner.walletBalance, history: files });
});

app.post('/api/partner/submit-file', async (req, res) => {
    const f = new StudentFile(req.body); await f.save();
    res.json({msg: "Application Submitted!"});
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

// --- SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));