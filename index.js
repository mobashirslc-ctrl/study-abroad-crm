const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
// এটি নিশ্চিত করবে যে public ফোল্ডারের ভেতর সব ফাইল সার্ভার খুঁজে পায়
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Connection ---
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ CRM Master Database Connected'));

// --- SCHEMAS (আপনার সব ফিল্ড এখানে আছে) ---

// ১. ইউনিভার্সিটি স্কিমা
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, acadScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. পার্টনার স্কিমা (পেন্ডিং/অ্যাক্টিভ লজিক)
const PartnerSchema = new mongoose.Schema({
    name: String, email: String, pass: String, orgName: String, contact: String,
    status: { type: String, default: 'Pending' }, // ডিফল্ট পেন্ডিং থাকবে
    wallet: { total: {type: Number, default: 0}, pending: {type: Number, default: 0} },
    subscription: { package: String, expireDate: Date }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// ৩. ফাইল ট্র্যাকিং
const FileSchema = new mongoose.Schema({
    studentName: String, contact: String, university: String, pdfUrl: String,
    status: { type: String, default: 'File Opened' },
    openDate: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs (রিকোয়ারমেন্ট অনুযায়ী) ---

// পার্টনার রেজিস্ট্রেশন (পেন্ডিং থাকবে)
app.post('/api/auth/register', async (req, res) => {
    const newPartner = new Partner(req.body);
    await newPartner.save();
    res.json({ success: true, message: "Registration Successful! Status: Pending Approval." });
});

// পার্টনার লগইন (Active না হলে এরর দেবে)
app.post('/api/auth/login', async (req, res) => {
    const user = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!user) return res.json({ success: false, message: "Invalid Credentials!" });
    if (user.status !== 'Active') return res.json({ success: false, message: "Account is Pending Admin Approval!" });
    res.json({ success: true, user });
});

// স্মার্ট অ্যাসেসমেন্ট সার্চ (বাটন ফিক্সড)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree) query.degree = degree;
    if (language) query.language = language;

    const results = await University.find(query);
    res.json(results);
});

// অ্যাডমিন: পার্টনার স্ট্যাটাস আপডেট (Active/Block)
app.post('/api/admin/update-status', async (req, res) => {
    const { id, status } = req.body;
    await Partner.findByIdAndUpdate(id, { status: status });
    res.json({ success: true });
});

// অ্যাডমিন: ইউনিভার্সিটি অ্যাড (সব ফিল্ড)
app.post('/api/admin/add-uni', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

// --- DASHBOARD ROUTING (Cannot GET এরর সমাধান) ---

app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/compliance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'compliance.html'));
});

app.get('/team', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'team.html'));
});

app.get('/', (req, res) => {
    res.send("<h1>IHP Global CRM Server is Live</h1><p>Visit /partner or /admin</p>");
});

// Server Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master Server on Port ${PORT}`));