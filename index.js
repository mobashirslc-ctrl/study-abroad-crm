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
    uniName: String, courseName: String, commission: Number,
    status: { type: String, default: 'Received' },
    date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// --- ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- PARTNER API (FIXED) ---
app.get('/api/partner/details/:id', async (req, res) => {
    try {
        const p = await Partner.findById(req.params.id);
        res.json(p);
    } catch (e) { res.status(404).send(); }
});

app.post('/api/partner/submit-file', async (req, res) => {
    const { partnerId, studentName, contactNo, uniName, commission } = req.body;
    const newFile = new StudentFile(req.body);
    await newFile.save();
    await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });
    res.json({ msg: "Success" });
});

// --- AUTH & ADMIN (LOCKED) ---
app.post('/api/partner/register', async (req, res) => {
    try { const p = new Partner(req.body); await p.save(); res.json({msg: "Success"}); } 
    catch(e) { res.status(400).send(); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({email: req.body.email, pass: req.body.pass});
    if(p && p.status === 'Active') res.json({id: p._id, name: p.name});
    else res.status(401).json({msg: "Error"});
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, {status: req.body.status});
    res.json({msg: "Updated"});
});
app.post('/api/admin/add-university', async (req, res) => {
    const u = new University(req.body); await u.save(); res.json({msg: "Saved"});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on Port ${PORT}`));