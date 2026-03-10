const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
// Render Environment Variable থেকে URI নিবে
const mongoURI = process.env.MONGODB_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- UNIVERSITY SCHEMA (LOCKED: 21 FIELDS) ---
const UniversitySchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, semesterFee: String, totalFee: String,
    duration: String, currency: String, partnerCommission: String, 
    bankNameBD: String, loanAmount: String, maritalStatus: String,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, gapAcceptance: String, bankType: String,
    minAcademicScore: Number, passingYearLimit: String
});
const University = mongoose.model('University', UniversitySchema);

// --- PARTNER SCHEMA (UPDATED PER REQUIREMENT) ---
const PartnerSchema = new mongoose.Schema({
    name: String,
    contactNo: String,      // New
    orgName: String,        // New
    email: { type: String, unique: true },
    pass: String,
    status: { type: String, default: 'Pending' }, // Pending/Active/Inactive/Rejected
    expiryDate: Date,       // New
    walletBalance: { type: Number, default: 0 },
    registrationDate: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- API ROUTES ---

// Admin: Get all partners
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

// Admin: Approve/Reject/Update Partner
app.put('/api/admin/partner-update/:id', async (req, res) => {
    const { status, expiryDate } = req.body;
    await Partner.findByIdAndUpdate(req.params.id, { status, expiryDate });
    res.json({ msg: "Partner Updated" });
});

// Admin: Add University (21 Fields)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ msg: "University Added Successfully" });
    } catch (e) { res.status(500).json({ msg: "Error saving university" }); }
});

// Partner: Registration
app.post('/api/partner/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body); // name, contactNo, orgName, email, pass পাঠাতে হবে
        await newPartner.save();
        res.json({ msg: "Success" });
    } catch (e) { res.status(400).json({ msg: "Registration Failed" }); }
});

// HTML Routing
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));