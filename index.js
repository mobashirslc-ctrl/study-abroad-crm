const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const __root = path.resolve();
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));

// --- Schemes ---
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

// --- Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__root, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__root, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__root, 'public', 'partner.html')));

// --- Auth & Security APIs ---

// ১. স্ট্যাটাস চেক এপিআই (Deactivation ফিক্স করার জন্য)
app.get('/api/auth/check-status', async (req, res) => {
    try {
        const email = req.query.email;
        const user = await User.findOne({ email });
        if (user) {
            res.json({ status: user.status });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (user.role !== 'admin' && user.status !== 'active') {
        return res.status(403).json({ success: false, message: "Account pending or inactive." });
    }
    res.json({ success: true, role: user.role, name: user.name, email: user.email });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "Registration successful! Wait for Admin approval." });
    } catch (err) { res.status(400).json({ success: false, error: "Email already exists." }); }
});

// --- Data APIs ---
app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/admin/update-user-status', async (req, res) => {
    await User.findByIdAndUpdate(req.body.userId, { status: req.body.status });
    res.json({ success: true });
});

app.post('/api/admin/add-university', async (req, res) => {
    const uni = new University(req.body);
    await uni.save();
    res.json({ success: true });
});

app.get('/api/search-university', async (req, res) => {
    const unis = await University.find();
    res.json(unis);
});

// --- DB Connection ---
const dbURI = `mongodb+srv://IHPCRM:ihp2026@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
mongoose.connect(dbURI).then(() => {
    app.listen(process.env.PORT || 3000, () => console.log("🚀 Server Running..."));
});