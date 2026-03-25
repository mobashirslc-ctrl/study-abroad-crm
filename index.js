const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config();
const app = express();

// --- 🛠️ Middleware ---
app.use(cors()); 
app.use(express.json());
// Vercel-এর জন্য public ফোল্ডার কনফিগারেশন
app.use(express.static(path.join(__dirname, 'public')));

// --- 🗄️ MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // কানেকশন টাইমআউট ৫ সেকেন্ড
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ DB Error:', err.message));

// --- 👤 User Model ---
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- 🚀 API ROUTES ---

// Registration
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const cleanEmail = email.toLowerCase().trim(); //

        let user = await User.findOne({ email: cleanEmail });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        user = new User({ 
            fullName, 
            email: cleanEmail, 
            password: hashedPassword 
        });

        await user.save();
        res.status(201).json({ msg: 'Registration Successful' });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = email.toLowerCase().trim();

        // ইউজার খোঁজা
        const user = await User.findOne({ email: cleanEmail });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });
        
        // পাসওয়ার্ড তুলনা
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
        
        // সাকসেস রেসপন্স
        res.status(200).json({ 
            msg: 'Login Successful', 
            user: { email: user.email, name: user.fullName, role: user.role } 
        });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- 🌐 DEDICATED ROUTING (Frontend) ---
// Vercel-এ ফাইল পাথ নিশ্চিত করতে path.join ব্যবহার করা হয়েছে
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'))); // আপনার মেইন ফাইল index.html হলে
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

// সকল আননোন রাউটকে লগইন পেজে পাঠাবে
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));