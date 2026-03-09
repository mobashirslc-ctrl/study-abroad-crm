const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
// Static files folder
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("DB Connected")).catch(err => console.log(err));

// --- SCHEMAS ---
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
    walletBalance: { type: Number, default: 0 }
}));

// --- HTML ROUTING (এটি আপনার এরর ফিক্স করবে) ---

// Admin Page: /admin লিখে এন্টার দিলে admin.html দেখাবে
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Partner Dashboard: /partner লিখে এন্টার দিলে partner.html দেখাবে
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

// Login Page: /login লিখে এন্টার দিলে login.html দেখাবে
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- API ENDPOINTS ---

// Admin: Save University
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Partner: Registration
app.post('/api/partner/register', async (req, res) => {
    try {
        const partner = new Partner(req.body);
        await partner.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, message: "Email exists" }); }
});

// Partner: Login
app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.status(404).json({ message: "Not found" });
    if (partner.status !== 'Active') return res.status(403).json({ message: "Not Approved" });
    res.json(partner);
});

// Admin: Get Partner List
app.get('/api/admin/partners', async (req, res) => {
    const data = await Partner.find();
    res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Live"));