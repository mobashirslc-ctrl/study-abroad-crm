const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ CRM Master Connected'));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, fee: String, currency: String,
    bankNameBD: String, partnerCommission: String, maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, 
    status: { type: String, default: 'Pending' } // ডিফল্ট পেন্ডিং থাকবে
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- APIs ---

// ১. রেজিস্ট্রেশন (পেন্ডিং থাকবে)
app.post('/api/auth/register', async (req, res) => {
    const existing = await Partner.findOne({ email: req.body.email });
    if (existing) return res.json({ success: false, message: "Email already exists!" });
    
    const newPartner = new Partner(req.body);
    await newPartner.save();
    res.json({ success: true, message: "Registration successful! Status: Pending Approval." });
});

// ২. লগইন (অ্যাক্টিভ না হলে ঢুকতে দেবে না)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "Invalid Email or Password!" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account is Pending Admin Approval!" });
    
    res.json({ success: true, user });
});

// ৩. সার্চ ইউনিভার্সিটি (বাটন ফিক্সড)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    const results = await University.find({ 
        country: new RegExp(country, 'i'), 
        degree: degree 
    });
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Running on ${PORT}`));