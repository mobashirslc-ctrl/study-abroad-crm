const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Connection ---
const DB_URI = process.env.MONGODB_URI;

mongoose.connect(DB_URI)
    .then(() => console.log("IHP CRM: Database Connected Successfully"))
    .catch(err => {
        console.error("DB Connection Error: ", err);
        process.exit(1); // কানেকশন ফেইল করলে সার্ভার বন্ধ হয়ে যাবে যাতে আপনি লগ দেখতে পারেন
    });

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    location: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, orgName: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' },
    walletBalance: { type: Number, default: 0 }
}));

// --- Routes ---

// Page Routing (Fixes 404 Error)
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// Partner APIs
app.post('/api/partner/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.json({ success: true, message: "Registration successful. Wait for Admin Approval." });
    } catch (e) { res.status(400).json({ success: false, message: "Email already exists." }); }
});

app.post('/api/partner/login-check', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner) return res.json({ approved: false, msg: "User not found" });
    if (partner.status === 'Active') {
        res.json({ approved: true, partnerId: partner._id, name: partner.name });
    } else {
        res.json({ approved: false, msg: "Account Pending Approval." });
    }
});

app.post('/api/partner/assessment', async (req, res) => {
    const { country, degree } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    const results = await University.find(query);
    res.json(results);
});

// Admin APIs
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

app.patch('/api/admin/update-partner/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

// --- Server Startup (Crucial for Render) ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});