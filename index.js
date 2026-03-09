const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("System Locked")).catch(err => console.log(err));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    contactNo: String, status: { type: String, default: 'Inactive' }, expiryDate: String,
    totalCommission: { type: Number, default: 0 }, pendingAmount: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, contact: String,
    university: String, pdfUrl: String, visaStatus: { type: String, default: 'Pending' },
    complianceMember: String, appliedDate: { type: Date, default: Date.now }
}));

// --- Auth APIs ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await new Partner({ ...req.body, password: hashedPassword }).save();
        res.status(200).send("Registration Successful! Wait for Approval.");
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner || partner.status !== 'Active') return res.status(403).send("Account Inactive");
    const match = await bcrypt.compare(req.body.password, partner.password);
    if (!match) return res.status(400).send("Wrong Password");
    res.status(200).json({ partnerId: partner._id, name: partner.name });
});

// --- University Search (Smart Assessment) ---
app.post('/api/uni-search', async (req, res) => {
    const { country, degree, languageType } = req.body;
    const results = await University.find({ country, degree, languageType });
    res.json(results);
});

// --- Routes Mapping ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Live on " + PORT));