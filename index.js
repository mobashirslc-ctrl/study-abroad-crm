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

// public ফোল্ডারটিকে স্ট্যাটিক হিসেবে ঘোষণা করা
app.use(express.static(path.join(__dirname, 'public')));

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

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Database Schema ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  documentUrl: String,
  createdAt: { type: Date, default: Date.now }
}));

// --- 1. Home Page (Partner Link) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 2. Data Submission ---
app.post('/submit-partner', upload.single('document'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const newPartner = new Partner({
      name, email, phone,
      documentUrl: req.file ? req.file.path : null
    });
    await newPartner.save();
    res.status(200).send('✅ Success! Data and file saved.');
  } catch (error) {
    res.status(500).send('❌ Submission Failed.');
  }
});

// --- 3. Admin Panel (Admin Link) ---
// URL: https://study-abroad-crm.onrender.com/admin-panel?pass=CRM2026
app.get('/admin-panel', async (req, res) => {
  if (req.query.pass !== 'CRM2026') return res.status(401).send('<h1>Access Denied</h1>');

  try {
    const students = await Partner.find().sort({ createdAt: -1 });
    let rows = students.map(s => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding:10px;">${s.name}</td>
        <td style="padding:10px;">${s.phone}</td>
        <td style="padding:10px;"><a href="${s.documentUrl}" target="_blank">View File</a></td>
        <td style="padding:10px;">${new Date(s.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    res.send(`
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>🎓 Admin Panel - Student List</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr style="background:#f4f4f4; text-align:left;">
            <th style="padding:10px;">Name</th><th style="padding:10px;">Phone</th>
            <th style="padding:10px;">Document</th><th style="padding:10px;">Date</th>
          </tr>
          ${rows}
        </table>
      </div>
    `);
  } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));