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
mongoose.connect(mongoURI).then(() => console.log("✅ Mission Database Locked")).catch(err => console.log(err));

// --- SCHEMAS (LOCKED) ---
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
    passportNo: String, studentEmail: String,
    uniName: String, commission: Number,
    status: { type: String, default: 'Pending' }, 
    complianceStatus: { type: String, default: 'File Received' },
    date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// --- HTML ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- AUTH API ---
app.post('/api/partner/register', async (req, res) => {
    try { const p = new Partner(req.body); await p.save(); res.json({msg: "Success"}); } 
    catch(e) { res.status(400).json({msg: "Email exists"}); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({email: req.body.email, pass: req.body.pass});
    if(p && p.status === 'Active') res.json({id: p._id, name: p.name, wallet: p.walletBalance});
    else res.status(401).json({msg: "Account Pending or Invalid"});
});

// --- PARTNER & ESCROW API ---
app.post('/api/partner/submit-file', async (req, res) => {
    try { const f = new StudentFile(req.body); await f.save(); res.json({msg: "Success"}); }
    catch(e) { res.status(500).send(); }
});

app.get('/api/partner/history/:id', async (req, res) => {
    const history = await StudentFile.find({ partnerId: req.params.id }).sort({date: -1});
    res.json(history);
});

// --- ADMIN & COMPLIANCE API ---
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, {status: req.body.status});
    res.json({msg: "Updated"});
});
app.post('/api/admin/add-university', async (req, res) => {
    const u = new University(req.body); await u.save(); res.json({msg: "Saved"});
});
app.get('/api/universities', async (req, res) => res.json(await University.find()));

// Compliance Verification
app.put('/api/admin/verify-file/:fileId', async (req, res) => {
    const { action } = req.body; 
    const file = await StudentFile.findById(req.params.fileId);
    if (!file || file.status !== 'Pending') return res.status(400).send();

    if (action === 'Fix') {
        file.status = 'Fixed';
        file.complianceStatus = 'File Opening Start';
        await Partner.findByIdAndUpdate(file.partnerId, { $inc: { walletBalance: file.commission } });
    } else {
        file.status = 'Rejected';
        file.complianceStatus = 'File Rejected';
    }
    await file.save();
    res.json({ msg: "Done" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on Port ${PORT}`));