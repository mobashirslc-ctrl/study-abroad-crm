const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // ফাইল আপলোডের জন্য
const app = express();

const __root = path.resolve();
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));
app.use('/uploads', express.static(path.join(__root, 'public/uploads'))); // আপলোড করা ফাইল অ্যাক্সেস করার জন্য

// --- MongoDB Schemas ---
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

// স্টুডেন্ট ফাইল সাবমিশন স্কিমা
const studentSchema = new mongoose.Schema({
    partnerEmail: String,
    studentName: String,
    studentPhone: String,
    appliedUniversity: String,
    files: [String], // ফাইলের নামগুলো এখানে থাকবে
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', studentSchema);

// --- Multer File Storage Setup ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- API Routes ---

// ১. স্ট্যাটাস চেক এপিআই
app.get('/api/auth/check-status', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        res.json({ status: user ? user.status : 'notfound' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ২. লগইন ও রেজিস্ট্রেশন
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.role !== 'admin' && user.status !== 'active') return res.status(403).json({ success: false, message: "Account inactive." });
    res.json({ success: true, role: user.role, name: user.name, email: user.email });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        await new User(req.body).save();
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false }); }
});

// ৩. ইউনিভার্সিটি সার্চ (Timestamp ক্যাশ সমস্যা সমাধান)
app.get('/api/search-university', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

app.post('/api/admin/add-university', async (req, res) => {
    await new University(req.body).save();
    res.json({ success: true });
});

app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/admin/update-user-status', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { status: req.body.status });
    res.json({ success: true });
});

// ৪. স্টুডেন্ট ফাইল সাবমিশন এপিআই

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
        res.json({ success: true, message: "Application Submitted Successfully! ✅" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Server & DB ---
const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
mongoose.connect(dbURI).then(() => {
    app.listen(process.env.PORT || 3000, () => console.log("🚀 Server Running..."));
});