const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// --- ১. Cloudinary Configuration ---
cloudinary.config({
  cloud_name: 'ddziennkh',
  api_key: '698924766176623',
  api_secret: '2KKz-mDmFLlav5wHeXtjMTn40Vs' // আপনার স্ক্রিনশট থেকে সংগৃহীত
});

// --- ২. Cloudinary Storage Setup ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student_documents',
    resource_type: 'auto',
  },
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ৩. Database Schemas ---
const studentSchema = new mongoose.Schema({
    partnerEmail: String,
    studentName: String,
    studentPhone: String,
    appliedUniversity: String,
    files: [String], // এখানে Cloudinary URL সেভ হবে
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', studentSchema);

// --- ৪. API Routes ---

// ফাইল সাবমিশন (রেন্ডার-এ ফাইল হারানোর ভয় নেই)
app.post('/api/partner/submit-file', upload.array('docs', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }
        const fileUrls = req.files.map(f => f.path);
        const newSubmission = new Student({
            partnerEmail: req.body.partnerEmail,
            studentName: req.body.studentName,
            studentPhone: req.body.studentPhone,
            appliedUniversity: req.body.appliedUniversity,
            files: fileUrls
        });
        await newSubmission.save();
        res.json({ success: true, message: "Successfully Uploaded to Cloudinary! ✅" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- ৫. Database & Server ---
const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/IHP_CRM?retryWrites=true&w=majority`;

mongoose.connect(dbURI)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log("🚀 Server Live with Cloudinary Storage!");
        });
    })
    .catch(err => console.log("❌ DB Error:", err));