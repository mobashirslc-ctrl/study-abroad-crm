const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // পাসওয়ার্ড এনক্রিপশনের জন্য
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Systems Connected")).catch(err => console.log(err));

// --- Partner Schema ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    contactNo: String,
    status: { type: String, default: 'Inactive' }, // রেজিস্ট্রেশনের সময় ইনঅ্যাক্টিভ থাকবে
    expiryDate: String
}));

// --- API: Partner Registration ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, password, contactNo } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newPartner = new Partner({ name, email, password: hashedPassword, contactNo });
        await newPartner.save();
        res.status(200).send("Account Created! Admin will approve soon.");
    } catch (err) {
        res.status(500).send("Registration Failed. Email might exist.");
    }
});

// --- API: Partner Login ---
app.post('/api/partner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await Partner.findOne({ email });
        if (!partner) return res.status(404).send("Account not found");
        
        // স্ট্যাটাস চেক (অ্যাডমিন এপ্রুভ না করলে ঢুকতে পারবে না)
        if (partner.status !== 'Active') return res.status(403).send("Account Inactive. Contact Admin.");

        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) return res.status(400).send("Invalid Credentials");

        res.status(200).json({ partnerId: partner._id, name: partner.name });
    } catch (err) {
        res.status(500).send("Login Error");
    }
});

// --- API: Admin Data Load & Update ---
app.get('/api/admin-data', async (req, res) => {
    const partners = await Partner.find();
    res.json({ partners });
});

app.patch('/api/update-partner/:id', async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, req.body);
        res.status(200).send("Updated");
    } catch (e) { res.status(500).send("Error"); }
});

// Route Serving
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("System Running..."));