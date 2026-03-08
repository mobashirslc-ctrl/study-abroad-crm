const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: 'ddziennkh',
  api_key: '698924766176623',
  api_secret: '2KKz-mDmFLlav5wHeXtjMTn40Vs'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'crm-uploads', allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'] },
});
const upload = multer({ storage: storage });

// --- MongoDB Connection ---
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ DB Connected & Schema Ready'));

// --- Database Schemas (আপনার স্ট্রাকচার অনুযায়ী) ---

// ১. ইউনিভার্সিটি ও অ্যাসেসমেন্ট ডাটা (Admin & Team adds this)
const UniSchema = new mongoose.Schema({
  country: String, uniName: String, course: String, intake: String,
  degree: String, // UG, PG, Diploma, etc.
  language: String, // IELTS, PTE, etc.
  minScore: String, fee: String, currency: String,
  bankBalance: String, bankType: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// ২. স্টুডেন্ট ফাইল ট্র্যাকিং
const StudentSchema = new mongoose.Schema({
  name: String, phone: String, university: String,
  docUrl: String, status: { type: String, default: 'Pending' },
  partnerId: String, complianceId: String,
  createdAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

// ৩. পার্টনার প্রোফাইল (Subscription & Wallet)
const PartnerSchema = new mongoose.Schema({
  name: String, status: { type: String, default: 'Pending' }, // Active/Deactivate
  balance: { type: Number, default: 0 },
  subscriptionExpire: Date
});
const PartnerUser = mongoose.model('PartnerUser', PartnerSchema);

// --- ৪টি স্থায়ী লিঙ্ক (Permanent Routes) ---

app.get('/partner', (req, res) => res.sendFile(path.join(publicPath, 'partner.html')));

app.get('/admin', (req, res) => {
    if (req.query.pass !== 'CRM2026') return res.status(401).send('Unauthorized');
    res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/compliance', (req, res) => res.sendFile(path.join(publicPath, 'compliance.html')));

app.get('/student', (req, res) => res.sendFile(path.join(publicPath, 'student.html')));

app.get('/team-admin', (req, res) => res.sendFile(path.join(publicPath, 'team-admin.html')));

app.get('/', (req, res) => res.redirect('/partner'));

// --- API: ইউনিভার্সিটি অ্যাড করা (Admin/Team Admin) ---
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true, message: "University Added!" });
    } catch (e) { res.status(500).send(e); }
});

// --- API: স্মার্ট অ্যাসেসমেন্ট সার্চ (Partner Portal) ---
app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ country, degree, language });
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM v2.0 Live on ${PORT}`));