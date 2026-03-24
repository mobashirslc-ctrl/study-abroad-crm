const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Environment Variables Load kora
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
// Static files (CSS, JS, Images) public folder theke load hobe
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Connection (Secure) ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in Environment Variables!');
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Connected Securely'))
        .catch(err => console.log('❌ DB Error:', err.message));
}

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' }
}));

// --- API ROUTES ---

// Register API
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

// Login API
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

// --- DEDICATED ROUTING (Fix for Blank Pages) ---

// Main Landing / Tracking Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Specific Track Route
app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Partner Access / Login
app.get('/partner-access', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Other Pages
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

// Catch-all route (Jodi uporer kono route na mile, tobe track.html e pathabe)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));