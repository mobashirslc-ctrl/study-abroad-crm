const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI; 
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

// --- UNIVERSITY SCHEMA (LOCKED: 21+ FIELDS) ---
const UniversitySchema = new mongoose.Schema({
    uniName: String, location: String, country: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: String,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String,
    minAcademicScore: Number, // New Field
    passingYearLimit: String  // New Field
});
const University = mongoose.model('University', UniversitySchema);

// --- PARTNER SCHEMA ---
const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' }, 
    walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTING ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// --- API ---
app.post('/api/partner/register', async (req, res) => {
    try { await new Partner(req.body).save(); res.json({ msg: "Success" }); }
    catch (e) { res.status(400).json({ msg: "Error" }); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!p) return res.status(401).json({ msg: "Invalid" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Pending" });
    res.json({ id: p._id, name: p.name });
});

app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.put('/api/admin/partner-status/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ msg: "Updated" });
});

app.post('/api/admin/add-university', async (req, res) => {
    await new University(req.body).save();
    res.json({ msg: "Saved" });
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on ${PORT}`));