const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION (THE FIX) ---
const rawURI = process.env.MONGODB_URI;
const mongoURI = rawURI ? rawURI.trim() : null; // স্পেস রিমুভ করবে

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected & Locked"))
    .catch(err => console.error("❌ DB Connection Error:", err.message));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, semesterFee: String, 
    partnerCommission: Number, bankNameBD: String, maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTES (FIXED PATHS) ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// --- API SECTION ---
app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (p && p.status === 'Active') res.json({ id: p._id, name: p.name });
    else res.status(401).json({ msg: "Invalid or Pending" });
});

app.get('/api/partner/details/:id', async (req, res) => {
    const p = await Partner.findById(req.params.id);
    res.json(p);
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mission Running on Port ${PORT}`));