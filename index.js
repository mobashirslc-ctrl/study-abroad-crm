const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to Database'));

// --- SCHEMAS ---

// ইউনিভার্সিটি স্কিমা (সব ফিল্ড সহ)
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, course: String, intake: String,
    degree: String, fee: String, currency: String, bankReq: String, bankType: String,
    bankNameBD: String, loanAmount: String, partnerCommission: String, maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

// স্টুডেন্ট ফাইল ট্র্যাকিং (PDF ও কমপ্লায়েন্স সহ)
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, 
    pdfUrl: { type: String, default: '#' },
    status: { type: String, default: 'Pending' },
    complianceMember: { name: String, id: String },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// পার্টনার স্কিমা (উইথড্র ও সাবস্ক্রিপশন সহ)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, status: { type: String, default: 'Pending' },
    wallet: { total: Number, pending: Number, withdrawn: Number },
    subscription: { package: String, expireDate: Date, isBlocked: { type: Boolean, default: false } }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- APIs ---

// ইউনিভার্সিটি অ্যাড (Admin Only)
app.post('/api/admin/add-uni', async (req, res) => {
    const newUni = new University(req.body);
    await newUni.save();
    res.json({ success: true });
});

// স্মার্ট অ্যাসেসমেন্ট সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    const results = await University.find({ 
        country: new RegExp(country, 'i'), 
        degree: degree 
    });
    res.json(results);
});

// ফাইল ওপেনিং (PDF লিঙ্ক সহ)
app.post('/api/open-file', async (req, res) => {
    const newFile = new FileTrack(req.body);
    await newFile.save();
    res.json({ success: true });
});

// উইথড্র রিকোয়েস্ট
app.post('/api/partner/withdraw', async (req, res) => {
    // লজিক: মেথড (Bkash/Nagad/Bank) অনুযায়ী প্রসেস হবে
    res.json({ success: true, message: "Withdrawal Request Sent" });
});

// ফাইল লিস্ট গেট করা
app.get('/api/files', async (req, res) => {
    const files = await FileTrack.find().sort({ openTime: -1 });
    res.json(files);
});

// --- ROUTES ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));