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
app.use(express.static('public'));

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: 'ddziennkh',
  api_key: '698924766176623',
  api_secret: '2KKz-mDmFLlav5wHeXtjMTn40Vs'
});

// --- Storage Setup ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'crm-uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
  },
});

const upload = multer({ storage: storage });

// --- MongoDB Connection (Using your new credentials) ---
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected Successfully with IHPCRM'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Database Schema ---
const partnerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  documentUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Partner = mongoose.model('Partner', partnerSchema);

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit-partner', upload.single('document'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const newPartner = new Partner({
      name, email, phone,
      documentUrl: req.file ? req.file.path : null
    });
    await newPartner.save();
    res.status(200).send('✅ Data Submitted and File Uploaded!');
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).send('❌ Internal Server Error');
  }
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is Live on port ${PORT}`);
});