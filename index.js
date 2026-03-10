const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
// আপনার MongoDB URI এখানে দিন
const mongoURI = "YOUR_MONGODB_URI_HERE"; 
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected & Locked"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- SCHEMAS ---
const PartnerSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTING FIX (FOR BROWSER) ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- AUTH API ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, pass } = req.body;
        const newPartner = new Partner({ name, email, pass });
        await newPartner.save();
        res.json({ msg: "Success" });
    } catch (e) { res.status(400).json({ msg: "Email exists" }); }
});

app.post('/api/partner/login', async (req, res) => {
    const { email, pass } = req.body;
    const p = await Partner.findOne({ email, pass });
    if (!p) return res.status(401).json({ msg: "Invalid Credentials" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Account Pending Approval" });
    res.json({ id: p._id, name: p.name });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Mission Running on Port ${PORT}`));