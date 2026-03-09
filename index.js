const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Fully Integrated")).catch(err => console.log(err));

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
    status: { type: String, default: 'Inactive' }, // Approval System
    walletBalance: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Due' },
    subscriptionStatus: { type: String, default: 'Inactive' }
}));

// --- Admin APIs ---
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    try { const partners = await Partner.find(); res.json(partners); }
    catch (e) { res.status(500).send("Error"); }
});

app.patch('/api/admin/update-partner/:id', async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).send("Update failed"); }
});

// --- Partner Registration & Login Step 1 ---
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

app.post('/api/partner/login-check', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.json({ approved: false, msg: "User not found" });
    if (partner.status === 'Active') {
        res.json({ approved: true, partnerId: partner._id, name: partner.name });
    } else {
        res.json({ approved: false, msg: "Account Pending. Contact Admin." });
    }
});

// Routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("System Live on Port " + PORT));