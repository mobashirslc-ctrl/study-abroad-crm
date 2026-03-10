const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DB CONNECTION ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => console.log("✅ DB Locked")).catch(err => console.log(err));

// --- SCHEMAS ---
const University = mongoose.model('University', new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: Number,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, passportNo: String,
    studentEmail: String, uniName: String, commission: Number,
    status: { type: String, default: 'Observation' }, 
    date: { type: Date, default: Date.now }
}));

// --- ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- API: PARTNER ACTIONS ---
app.post('/api/partner/register', async (req, res) => {
    try { const p = new Partner(req.body); await p.save(); res.json({msg: "Success"}); } 
    catch(e) { res.status(400).send(); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({email: req.body.email, pass: req.body.pass});
    if(p && p.status === 'Active') res.json({id: p._id, name: p.name});
    else res.status(401).json({msg: "Pending or Invalid"});
});

app.get('/api/partner/details/:id', async (req, res) => res.json(await Partner.findById(req.params.id)));

app.post('/api/partner/submit-file', async (req, res) => {
    const newFile = new StudentFile(req.body);
    await newFile.save();
    await Partner.findByIdAndUpdate(req.body.partnerId, { $inc: { pendingBalance: req.body.commission } });
    res.json({ msg: "Success" });
});

app.get('/api/partner/history/:id', async (req, res) => res.json(await StudentFile.find({partnerId: req.params.id}).sort({date:-1})));

// --- API: ADMIN & UNIVERSITIES ---
app.get('/api/universities', async (req, res) => res.json(await University.find()));
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/admin/add-university', async (req, res) => {
    const u = new University(req.body); await u.save(); res.json({msg: "Saved"});
});
app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, {status: req.body.status});
    res.json({msg: "Updated"});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on ${PORT}`));