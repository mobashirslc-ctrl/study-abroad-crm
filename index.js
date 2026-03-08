const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Master Database Connected'));

// --- SCHEMAS ---

// ১. ইউনিভার্সিটি (সব রিকোয়ার্ড ফিল্ড)
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, course: String, intake: String,
    degree: String, fee: String, currency: String, bankReq: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. পার্টনার (রেজিস্ট্রেশন ও অ্যাপ্রুভাল)
const PartnerSchema = new mongoose.Schema({
    name: String, orgName: String, contact: String, email: String, password: String,
    status: { type: String, default: 'Pending' }, // Pending -> Active/Deactivate
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} },
    subscription: { package: {type: String, default: 'Basic'}, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ৩. ফাইল ট্র্যাকিং (PDF সহ)
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'Processing' },
    complianceMember: { name: String, org: String, id: String },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// Partner Registration
app.post('/api/partner/register', async (req, res) => {
    const partner = new Partner(req.body);
    await partner.save();
    res.json({ success: true, message: "Registration successful. Pending admin approval." });
});

// Partner Login (Only if Active)
app.post('/api/partner/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, password: req.body.password, status: 'Active' });
    if (user) res.json({ success: true, user });
    else res.json({ success: false, message: "Account not active or invalid credentials." });
});

// Admin: University Adding
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// Admin: Partner Status Update (Active/Deactivate)
app.post('/api/admin/update-partner', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status });
    res.json({ success: true });
});

// Partner: Search & File Open
app.get('/api/search-uni', async (req, res) => {
    const results = await University.find({ country: new RegExp(req.query.country, 'i'), degree: req.query.degree });
    res.json(results);
});

app.post('/api/open-file', async (req, res) => {
    await new FileTrack(req.body).save();
    res.json({ success: true });
});

app.get('/api/admin/files', async (req, res) => res.json(await FileTrack.find().sort({openTime:-1})));
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));

// Routes
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM Running on ${PORT}`));