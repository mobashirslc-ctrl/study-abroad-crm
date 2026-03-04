const express = require('express');
const mongoose = require('mongoose'); // Mongoose ইমপোর্ট নিশ্চিত করা হয়েছে
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// আপনার দেওয়া পাসওয়ার্ড 'Gorun2026' এখানে ব্যবহার করা হয়েছে
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

// --- AUTOMATIC TEST USER CREATION ---
// সার্ভার চালু হওয়ার সাথে সাথে এই ইউজারটি তৈরি হবে যাতে আপনি লগইন করতে পারেন
mongoose.connection.once('open', async () => {
    try {
        const checkUser = await Partner.findOne({ email: 'admin@test.com' });
        if (!checkUser) {
            const testPartner = new Partner({
                name: "Test Admin",
                email: "admin@test.com",
                password: "123", // লগইনের জন্য এই পাসওয়ার্ডটি ব্যবহার করবেন
                walletBalance: 500
            });
            await testPartner.save();
            console.log("🚀 Test Partner Created: admin@test.com / 123");
        }
    } catch (err) {
        console.log("Error creating test user:", err);
    }
});

// --- ROUTES ---

// ১. পার্টনার লগইন রুট
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

// ২. ড্যাশবোর্ড ডাটা রুট
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

// ৩. ইউনিভার্সিটি লিস্ট রুট
app.get('/api/universities', async (req, res) => {
    try {
        const universities = await University.find();
        res.json(universities);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch universities" });
    }
});

// সার্ভার পোর্ট কনফিগারেশন
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Server is running on port ${PORT}`);
});