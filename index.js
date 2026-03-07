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

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected with IHPCRM'))
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

// --- 1. Home Page (Partner Form) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 2. Data Submission Route ---
app.post('/submit-partner', upload.single('document'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const newPartner = new Partner({
      name, email, phone,
      documentUrl: req.file ? req.file.path : null
    });
    await newPartner.save();
    res.status(200).send('✅ Data Submitted and File Uploaded Successfully!');
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).send('❌ Error: Could not save data.');
  }
});

// --- 3. Protected Admin Panel Route ---
// ইউআরএল হবে: https://your-link.onrender.com/admin-panel?pass=CRM2026
app.get('/admin-panel', async (req, res) => {
  const adminPass = req.query.pass;

  if (adminPass !== 'CRM2026') {
    return res.status(401).send('<h1>🚫 Access Denied</h1><p>Please provide the correct password in the URL.</p>');
  }

  try {
    const students = await Partner.find().sort({ createdAt: -1 });
    
    let tableRows = students.map(s => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding:12px;">${s.name}</td>
        <td style="padding:12px;">${s.email}</td>
        <td style="padding:12px;">${s.phone}</td>
        <td style="padding:12px;">
          <a href="${s.documentUrl}" target="_blank" style="background:#007bff; color:white; padding:5px 10px; text-decoration:none; border-radius:4px;">View Document</a>
        </td>
        <td style="padding:12px;">${new Date(s.createdAt).toLocaleString()}</td>
      </tr>
    `).join('');

    res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f9f9f9; min-height: 100vh;">
        <div style="max-width: 1000px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">🎓 Student Tracking Admin Panel</h2>
          <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #007bff; color: white; text-align: left;">
                <th style="padding:12px;">Name</th>
                <th style="padding:12px;">Email</th>
                <th style="padding:12px;">Phone</th>
                <th style="padding:12px;">Document</th>
                <th style="padding:12px;">Date Submited</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p style="margin-top:20px; color:#666;">Total Records: ${students.length}</p>
        </div>
      </div>
    `);
  } catch (err) {
    res.status(500).send("Error loading admin panel");
  }
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is Live on port ${PORT}`);
});