const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: System Online")).catch(err => console.error(err));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    appFee: String, deadline: String, scholarship: String, workRights: String, location: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, orgName: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, 
    walletBalance: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Due' },
    subscriptionStatus: { type: String, default: 'Inactive' }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String, studentContact: String, universityName: String,
    commissionAmount: Number, status: { type: String, default: 'File Opening' },
    createdAt: { type: Date, default: Date.now }
}));

// --- ADMIN APIs ---
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    try { const partners = await Partner.find(); res.json(partners); }
    catch (e) { res.status(500).send("Error"); }
});

app.patch('/api/admin/update-partner/:id', async (req, res) => {
    try { await Partner.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { res.status(500).send("Error"); }
});

// --- PARTNER APIs ---
app.post('/api/partner/register', async (req, res) => {
    try { await new Partner(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(400).json({ success: false, message: "Email already exists" }); }
});

app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(404).json({ message: "User not found" });
    if (partner.status !== 'Active') return res.status(403).json({ message: "Waiting for Admin Approval" });
    res.json(partner);
});

app.post('/api/partner/assessment', async (req, res) => {
    const { country, degree, languageType } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (languageType) query.languageType = languageType;
    const results = await University.find(query);
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Running"));