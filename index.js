const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
const mongoURI = 'mongodb+srv://admin2:CRM2026@cluster0.8qewhkr.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error: ", err.message));

// --- SCHEMAS ---
const partnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    files: { type: Array, default: [] }
});

const Partner = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);

// --- ROUTES ---

// ১. রেজিস্ট্রেশন রুট
app.post('/api/partners/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await Partner.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: "Email already exists!" });

        const newPartner = new Partner({ name, email, password });
        await newPartner.save();
        res.json({ success: true, message: "Registration successful!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ২. লগইন রুট
app.post('/api/partners/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const partner = await Partner.findOne({ email, password });
        if (partner) {
            res.json({ success: true, partnerId: partner._id, name: partner.name });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ৩. ড্যাশবোর্ড ডাটা রুট
app.get('/api/partners/dashboard/:id', async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        res.json(partner);
    } catch (err) {
        res.status(500).json({ error: "Not found" });
    }
});

// ৪. এলিজিবিলিটি চেক রুট
app.post('/api/check-eligibility', (req, res) => {
    const { gpa, ielts } = req.body;
    // ডামি ইউনিভার্সিটি ডাটা
    const unis = [
        { name: "University of Hertfordshire (UK)", minGPA: 3.0, minIELTS: 6.0 },
        { name: "Coventry University (UK)", minGPA: 3.5, minIELTS: 6.5 },
        { name: "York University (Canada)", minGPA: 4.0, minIELTS: 6.5 },
        { name: "Deakin University (Australia)", minGPA: 3.2, minIELTS: 6.0 }
    ];
    const eligible = unis.filter(u => gpa >= u.minGPA && ielts >= u.minIELTS);
    res.json({ success: true, results: eligible });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));