const express = require('express');
const mongoose = require('mongoose'); // Mongoose defined here
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// আপনার দেওয়া পাসওয়ার্ড 'Gorun2026' এখানে সেট করা হয়েছে
const mongoURI = 'mongodb+srv://admin:Gorun2026@cluster0.8qewhkr.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error: ", err));

// --- SCHEMAS ---

// Partner Schema
const partnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    files: [{
        studentName: String,
        university: String,
        status: { type: String, default: "Pending" },
        commission: { type: Number, default: 0 },
        lastUpdate: { type: Date, default: Date.now }
    }]
});

const Partner = mongoose.model('Partner', partnerSchema);

// University Schema
const universitySchema = new mongoose.Schema({
    name: String,
    country: String,
    course: String,
    tuitionFee: String,
    commission: Number
});

const University = mongoose.model('University', universitySchema);

// --- ROUTES ---

// ১. নতুন পার্টনার রেজিস্ট্রেশন
app.post('/api/partners/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.status(201).json({ message: "Partner Registered Successfully" });
    } catch (err) {
        res.status(400).json({ error: "Email already exists or invalid data" });
    }
});

// ২. পার্টনার লগইন
app.post('/api/partners/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const partner = await Partner.findOne({ email, password });
        if (partner) {
            res.json({ success: true, partnerId: partner._id, name: partner.name });
        } else {
            res.status(401).json({ success: false, message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ৩. ড্যাশবোর্ড ডাটা দেখা
app.get('/api/partners/dashboard/:id', async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        if (partner) {
            res.json(partner);
        } else {
            res.status(404).json({ message: "Partner not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Invalid ID format" });
    }
});

// ৪. সব ইউনিভার্সিটির লিস্ট দেখা
app.get('/api/universities', async (req, res) => {
    try {
        const universities = await University.find();
        res.json(universities);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch universities" });
    }
});

// সার্ভার পোর্ট সেটিংস
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});