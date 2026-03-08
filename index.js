const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to Master Database'));

// --- SCHEMAS ---

// স্টুডেন্ট ফাইল ট্র্যাকিং স্কিমা (নতুন ফিল্ড সহ)
const FileSchema = new mongoose.Schema({
    studentName: String,
    contact: String,
    university: String,
    degree: String,
    language: String,
    langScore: String,
    status: { type: String, default: 'Pending' },
    pdfUrl: { type: String, default: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    complianceInfo: { name: String, id: String },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// পার্টনার সাবস্ক্রিপশন ও ওয়ালেট স্কিমা
const PartnerSchema = new mongoose.Schema({
    name: String,
    email: String,
    orgName: String,
    status: { type: String, default: 'Pending' },
    subscription: { package: {type: String, default: 'Free'}, expireDate: {type: Date, default: Date.now} },
    wallet: { balance: {type: Number, default: 0} }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ইউনিভার্সিটি স্কিমা
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, fee: String, partnerCommission: String, bankNameSuggestion: String
});
const University = mongoose.model('University', UniSchema);

// --- APIs ---

// ফাইল সাবমিট করা
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// সব ফাইল গেট করা (অ্যাডমিন ও পার্টনারের জন্য)
app.get('/api/admin/files', async (req, res) => {
    const files = await FileTrack.find().sort({ openTime: -1 });
    res.json(files);
});

// ইউনিভার্সিটি সার্চ
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    const query = country ? { country: new RegExp(country, 'i') } : {};
    const results = await University.find(query);
    res.json(results);
});

// পার্টনার ডাটা (সাবস্ক্রিপশন সহ)
app.get('/api/partner/details', async (req, res) => {
    const partner = await Partner.findOne(); // Real app-এ ইমেইল দিয়ে ফিল্টার হবে
    res.json(partner);
});

// --- HTML Routes ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server Live on Port ${PORT}`));