const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Connection ---
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI)
    .then(() => console.log("IHP CRM: All Systems (Admin & Partner) Connected"))
    .catch(err => console.log("DB Connection Error: ", err));

// --- Schemas ---

// 1. University Schema (21 Fields)
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    appFee: String, deadline: String, scholarship: String, workRights: String, location: String
}));

// 2. Partner Schema (With Registration & Wallet)
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, orgName: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, // Approval logic
    walletBalance: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Due' },
    subscriptionStatus: { type: String, default: 'Inactive' },
    expiryDate: Date
}));

// --- ADMIN APIs ---

// Add University (Part 1)
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Get All Partners (Part 2 & 4)
app.get('/api/admin/partners', async (req, res) => {
    try { const partners = await Partner.find(); res.json(partners); }
    catch (e) { res.status(500).send("Error fetching partners"); }
});

// Update Partner Status/Info (Part 2 & 4)
app.patch('/api/admin/update-partner/:id', async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).send("Update failed"); }
});

// --- PARTNER APIs ---

// Step 1: Partner Registration
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, orgName, contact } = req.body;
        const newPartner = new Partner({ name, email, orgName, contact, status: 'Inactive' });
        await newPartner.save();
        res.json({ success: true, message: "Registration successful. Wait for Admin Approval." });
    } catch (e) {
        res.status(400).json({ success: false, message: "Email already exists." });
    }
});

// Step 1: Login & Approval Check
app.post('/api/partner/login-check', async (req, res) => {
    try {
        const partner = await