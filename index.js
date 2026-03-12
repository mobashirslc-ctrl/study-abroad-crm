const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ DB Error:', err));

// User Model
const User = mongoose.model('User', new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' }
}));

// --- API ROUTES ---

// Registration API
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        res.status(200).json({ msg: 'Login Successful', role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HTML ROUTING (Fixing 404) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/track', (req, res) => res.sendFile(path.join(__dirname, 'public', 'track.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));