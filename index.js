const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs'); 

const app = express();
const __root = path.resolve();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));

// --- Render-এর জন্য ফোল্ডার অটো-ক্রিয়েশন লজিক ---
const uploadDir = path.join(__root, 'public', 'Upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("📁 Created 'Upload' folder for Render.");
}
app.use('/Upload', express.static(uploadDir));

// --- 1. MongoDB Schemas ---
const universitySchema = new mongoose.Schema({
    country: String, name: String, location: String, courses: String,
    degree: String, semesterFee: Number, currency: String,
    languageRequired: String, minLanguageScore: String, minGPA: String,
    intake: String, scholarship: String, partnerCommission: Number,
    bankName: String, loanAmount: Number, bankAmountRequired: Number,
    bankType: String, maritalCondition: String
});
const University = mongoose.model('University', universitySchema);

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'partner', 'compliance', 'student'], required: true },
    status: { type: String, default: 'pending' }
});
const User = mongoose.model('User', userSchema);

const studentSchema = new mongoose.Schema({
    partnerEmail: String,
    studentName: String,
    studentPhone: String,
    appliedUniversity: String,
    files: [String],
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', studentSchema);

// --- 2. Multer Setup (Fixed Version) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // ফাইলের নাম থেকে স্পেস সরিয়ে ফেলা হচ্ছে এরর এড়াতে
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

// --- 3. API Routes ---

// ইউজার স্ট্যাটাস চেক
app.get('/api/auth/check-status', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        res.json({ status: user ? user.status : 'notfound' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// লগইন
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        if (user.role !== 'admin' && user.status !== 'active') return res.status(403).json({ success: false, message: "Account inactive" });
        res.json({ success: true, role: user.role, name: user.name, email: user.email });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ইউনিভার্সিটি সার্চ
app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ফাইল সাবমিশন এপিআই
app.post('/api/partner/submit-file', upload.array('docs', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }
        const fileNames = req.files.map(f => f.filename);
        const newSubmission = new Student({
            partnerEmail: req.body.partnerEmail,
            studentName: req.body.studentName,
            studentPhone: req.body.studentPhone,
            appliedUniversity: req.body.appliedUniversity,
            files: fileNames
        });
        await newSubmission.save();
        res.json({ success: true, message: "Submission Successful! ✅" });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// --- 4. Database & Server Connection ---
const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/IHP_CRM?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(dbURI)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log("🚀 Server Live and Connected to DB!");
        });
    })
    .catch(err => console.log("❌ DB Error:", err));