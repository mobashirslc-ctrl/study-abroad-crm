const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
// এটি public ফোল্ডারের ভেতরের সব ফাইল (CSS, JS, Images) ব্রাউজারকে পড়ার অনুমতি দেয়
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Error:', err.message));

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' }
}));

// --- API ROUTES (Backend Logic) ---

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        user = new User({ fullName, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ msg: 'Registration Successful' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
        
        res.status(200).json({ msg: 'Login Successful' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 🌐 DEDICATED ROUTING (Frontend Links) ---

// ১. মেইন রুট (Home) - এখন এটি সরাসরি লগইন পেজে নিয়ে যাবে
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ২. ট্র্যাকিং রুট - https://your-site.app/track
app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// ৩. পার্টনার ড্যাশবোর্ড
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

// ৪. লগইন এবং রেজিস্ট্রেশন পেজ
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

// ৫. ক্যাচ-অল রুট (যদি কেউ ভুল ইউআরএল দেয়, তাকে ট্র্যাকিং পেজে পাঠিয়ে দিবে)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Server Configuration
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));