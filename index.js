const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// এখানে ইউজারনেম 'admin2' এবং পাসওয়ার্ড 'CRM2026' ব্যবহার করা হয়েছে।
const mongoURI = 'mongodb+srv://admin2:CRM2026@cluster0.8qewhkr.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully")) // সফল হলে এটি লগে আসবে
    .catch(err => console.log("❌ MongoDB Connection Error: ", err.message)); // ব্যর্থ হলে এরর দেখাবে

// --- SCHEMAS ---
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

const Partner = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);

// --- TEST USER CREATION ---
// ডাটাবেস কানেক্ট হওয়ার পর admin@test.com ইউজারটি অটোমেটিক তৈরি হবে
mongoose.connection.once('open', async () => {
    try {
        const checkUser = await Partner.findOne({ email: 'admin@test.com' });
        if (!checkUser) {
            await new Partner({
                name: "Test Admin",
                email: "admin@test.com",
                password: "123", // লগইন করার সময় এটি ব্যবহার করবেন
                walletBalance: 500
            }).save();
            console.log("🚀 Test Partner Created: admin@test.com / 123");
        }
    } catch (err) {
        console.log("Error creating test user:", err);
    }
});

// --- ROUTES ---
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
        console.error("Login Error:", err);
        res.status(500).json({ error: "Internal Server Error" }); // ৫০০ এরর হ্যান্ডলিং
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server running on port ${PORT}`));