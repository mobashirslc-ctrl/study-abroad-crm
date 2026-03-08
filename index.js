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

// --- Cloudinary Configuration ---
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
mongoose.connect(mongoURI).then(() => console.log('✅ DB Connected Successfully'));

// --- Database Schema ---
const PartnerSchema = new mongoose.Schema({
  name: String, email: String, phone: String, status: { type: String, default: 'Pending' },
  documentUrl: String, createdAt: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ৫টি স্থায়ী লিঙ্ক (Permanent Routes) ---

app.get('/partner', (req, res) => { res.sendFile(path.join(publicPath, 'partner.html')); });

app.get('/admin', (req, res) => { 
    if (req.query.pass !== 'CRM2026') return res.status(401).send('🚫 Access Denied');
    res.sendFile(path.join(publicPath, 'admin.html')); 
});

app.get('/compliance', (req, res) => { res.sendFile(path.join(publicPath, 'compliance.html')); });

app.get('/student', (req, res) => { res.sendFile(path.join(publicPath, 'student.html')); });

app.get('/team-admin', (req, res) => { res.sendFile(path.join(publicPath, 'team-admin.html')); });

app.get('/', (req, res) => { res.redirect('/partner'); });

// --- API to Submit Data ---
app.post('/submit-partner', upload.single('document'), async (req, res) => {
  try {
    const newPartner = new Partner({ ...req.body, documentUrl: req.file ? req.file.path : null });
    await newPartner.save();
    res.status(200).send('✅ Success!');
  } catch (error) { res.status(500).send('❌ Error'); }
});

// --- API to Get Data for Admin ---
app.get('/api/get-data', async (req, res) => {
    const data = await Partner.find().sort({ createdAt: -1 });
    res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CRM running on port ${PORT}`));