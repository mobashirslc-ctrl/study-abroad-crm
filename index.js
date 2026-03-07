const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // ফাইল আপলোডের জন্য
const app = express();

const __root = path.resolve();
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));
// আপনার ফোল্ডারের নাম 'Upload' তাই স্ট্যাটিক পাথও সেভাবে দেওয়া হলো
app.use('/Upload', express.static(path.join(__root, 'public/Upload')));

// --- 1. MongoDB Schemas ---

// ইউনিভার্সিটি স্কিমা
const universitySchema = new mongoose.Schema({
    country: String, name: String, location: String, courses: String,
    degree: String, semesterFee: Number, currency: String,
    languageRequired: String, minLanguageScore: String, minGPA: String,
    intake: String, scholarship: String, partnerCommission: Number,
    bankName: String, loanAmount: Number, bankAmountRequired: Number,
    bankType: String, maritalCondition: String
});
const University = mongoose.model('University', universitySchema);

// ইউজার স্কিমা
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
    files: [String], // ফাইলগুলোর নামের লিস্ট
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', studentSchema);

// --- 2. Multer Configuration (Fixed for "Upload" folder) ---

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/Upload/'); // নিশ্চিত করুন এই ফোল্ডারটি আপনার public ফোল্ডারে আছে
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 3. API Routes ---

// ৩.১ ইউজার স্ট্যাটাস চেক (Security)
app.get('/api/auth/check-status', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        if (user) {
            res.json({ status: user.status });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ৩.২ লগইন ও রেজিস্ট্রেশন
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.role !== 'admin' && user.status !== 'active') {
        return res.status(403).json({ success: false, message: "Account inactive or pending." });
    }
    res.json({ success: true, role: user.role, name: user.name, email: user.email });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "Registered! Waiting for approval." });
    } catch (err) { res.status(400).json({ success: false, error: "Email exists." }); }
});

// ৩.৩ ইউনিভার্সিটি ডাটা
app.get('/api/search-university', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

app.post('/api/admin/add-university', async (req, res) => {
    const uni = new University(req.body);
    await uni.save();
    res.json({ success: true });
});

// ৩.৪ এডমিন ইউজার ম্যানেজমেন্ট
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/admin/update-user-status', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { status: req.body.status });
    res.json({ success: true });
});

// ৩.৫ স্টুডেন্ট ফাইল সাবমিশন (Partner API)
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
        res.json({ success: true, message: "Student File Submitted Successfully! ✅" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ৩.৬ এডমিন প্যানেলের জন্য সাবমিশন লিস্ট দেখা (Optional for next step)
app.get('/api/admin/submissions', async (req, res) => {
    const submissions = await Student.find().sort({ submittedAt: -1 });
    res.json(submissions);
});

// --- 4. Server & Database Connection ---

const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(dbURI)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log("🚀 Server is running on port 3000");
            console.log("📁 Upload folder ready: public/Upload");
        });
    })
    .catch(err => console.log("❌ DB Error:", err));