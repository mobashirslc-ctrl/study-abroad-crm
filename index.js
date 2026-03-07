const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary Configuration
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

// Database Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ DB Error:', err.message));

const Partner = mongoose.model('Partner', new mongoose.Schema({
  name: String, email: String, phone: String, documentUrl: String, createdAt: { type: Date, default: Date.now }
}));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit-partner', upload.single('document'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const newPartner = new Partner({ name, email, phone, documentUrl: req.file ? req.file.path : null });
    await newPartner.save();
    res.status(200).send('✅ Data Saved!');
  } catch (error) { res.status(500).send('❌ Failed'); }
});

app.get('/admin-panel', async (req, res) => {
  if (req.query.pass !== 'CRM2026') return res.status(401).send('<h1>Access Denied</h1>');
  try {
    const data = await Partner.find().sort({ createdAt: -1 });
    let rows = data.map(s => `<tr><td style="border:1px solid #ddd;padding:8px">${s.name}</td><td style="border:1px solid #ddd;padding:8px"><a href="${s.documentUrl}" target="_blank">View</a></td></tr>`).join('');
    res.send(`<div style="padding:20px;"><h2>Admin Panel</h2><table style="width:100%;border-collapse:collapse">${rows}</table></div>`);
  } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));