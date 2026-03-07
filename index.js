const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const app = express();

const __root = path.resolve();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));
app.use('/Upload', express.static(path.join(__root, 'public/Upload')));

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

// --- 2. Multer Setup ---

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/Upload/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 3. Page Routes (সার্ভার সাইড রাউটিং) ---

app.get('/', (req, res) => res.sendFile(path.join(__root, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__root, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__root, 'public', 'partner.html')));

// --- 4. API Routes ---

// ইউজার স্ট্যাটাস চেক
app.get('/api/auth/check-status', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        if (user) res.json({ status: user.status });
        else res.status(404).json({ message: "Not found" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// লগইন
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        if (user.role !== 'admin' && user.status !== 'active') return res.status(403).json({ success: false, message: "Inactive account" });
        res.json({ success: true, role: user.role, name: user.name, email: user.email });
    } catch (err) { res.status(500).json({ success: false }); }
});

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        await new User(req.body).save();
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false }); }
});

// ইউনিভার্সিটি ডাটা
app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/add-university', async (req, res) => {
    try {
        await new University(req.body).save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ইউজার ম্যানেজমেন্ট
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/admin/update-user-status', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { status: req.body.status });
    res.json({ success: true });
});

// স্টুডেন্ট ফাইল সাবমিশন
app.post('/api/partner/submit-file', upload.array('docs', 5), async (req, res) => {
    try {
        const fileNames = req.files.map(f => f.filename);
        const newSubmission = new Student({
            partnerEmail: req.body.partnerEmail,
            studentName: req.body.studentName,
            studentPhone: req.body.studentPhone,
            appliedUniversity: req.body.appliedUniversity,
            files: fileNames
        });
        await newSubmission.save();
        res.json({ success: true, message: "Success! ✅" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// --- 5. Database & Server Connection ---

const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(dbURI)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log("🚀 Server up and running!");
        });
    })
    .catch(err => console.log("DB connection error:", err));