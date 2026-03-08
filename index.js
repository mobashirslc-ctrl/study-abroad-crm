const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Database Connected Successfully'));

// --- SCHEMAS ---

// ১. ইউনিভার্সিটি (সব ড্রপডাউন ডাটা সহ)
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, course: String, intake: String,
    degree: String, language: String, langScore: String, fee: String, currency: String,
    bankReq: String, bankType: String, maritalStatus: String, bankNameBD: String,
    loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. পার্টনার (অ্যাপ্রুভাল সিস্টেম)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String, email: String, pass: String,
    status: { type: String, default: 'Pending' }, // Pending / Active / Blocked
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ৩. ফাইল ট্র্যাকিং (কমপ্লায়েন্স ও পিডিএফ সহ)
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'Processing' },
    complianceMember: { name: String, org: String, id: String },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// Partner Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.json({ success: true, message: "Registered! Wait for Admin Approval." });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Partner Login (Only if Active)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "User not found!" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account Pending/Blocked!" });
    res.json({ success: true, user });
});

// Admin: Approve/Block Partner
app.post('/api/admin/partner-status', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status });
    res.json({ success: true });
});

// University Search & File Open
app.get('/api/uni-search', async (req, res) => {
    const query = req.query.country ? { country: new RegExp(req.query.country, 'i') } : {};
    const results = await University.find(query);
    res.json(results);
});

app.post('/api/file-open', async (req, res) => {
    const newFile = new FileTrack(req.body);
    await newFile.save();
    res.json({ success: true });
});

// Data Fetch for Admin
app.get('/api/admin/all-files', async (req, res) => res.json(await FileTrack.find().sort({openTime:-1})));
app.get('/api/admin/all-partners', async (req, res) => res.json(await Partner.find()));

// Routes
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Running on ${PORT}`));