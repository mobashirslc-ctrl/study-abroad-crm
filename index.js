const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const mongoURI = process.env.MONGODB_URI; 
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

// --- UNIVERSITY SCHEMA (21+ FIELDS LOCKED) ---
const UniversitySchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, duration: String, currency: String,
    semesterFee: String, totalFee: String, partnerCommission: String,
    bankNameBD: String, loanAmount: String, maritalStatus: String,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, gapAcceptance: String, bankType: String,
    minAcademicScore: Number, passingYearLimit: String
});
const University = mongoose.model('University', UniversitySchema);

// --- PARTNER SCHEMA ---
const PartnerSchema = new mongoose.Schema({
    name: String, contactNo: String, orgName: String, email: { type: String, unique: true },
    pass: String, status: { type: String, default: 'Pending' }, 
    expiryDate: Date, walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- API ROUTES ---
app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!p) return res.status(401).json({ msg: "Invalid Credentials" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Account " + p.status });
    res.json({ id: p._id, name: p.name });
});

app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

app.put('/api/admin/partner-update/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, req.body);
    res.json({ msg: "Updated" });
});

app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.json({ msg: "Saved" }); }
    catch (e) { res.status(500).json({ msg: "Error" }); }
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));