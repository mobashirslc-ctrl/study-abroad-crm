আপনার MongoDB Authentication এররটি স্থায়ীভাবে সমাধান করার জন্য নতুন ইউজারনেম (admin2) এবং পাসওয়ার্ড (CRM12345) সহ সম্পূর্ণ কোড নিচে দেওয়া হলো।

মনে রাখবেন: এই কোডটি কাজ করার আগে আপনার MongoDB Atlas ড্যাশবোর্ডে গিয়ে admin2 নামে একটি ইউজার তৈরি করে নিতে হবে।

📄 সংশোধিত index.js (সম্পূর্ণ কোড):
JavaScript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// নতুন ইউজার admin2 এবং পাসওয়ার্ড CRM12345 ব্যবহার করা হয়েছে
const mongoURI = 'mongodb+srv://admin2:CRM12345@cluster0.8qewhkr.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully")) // এটি লগে আসলে বুঝবেন সব ঠিক আছে
    .catch(err => {
        console.log("❌ MongoDB Connection Error: ", err.message); // এরর হলে এখানে বিস্তারিত দেখাবে
    });

// --- SCHEMAS & MODELS ---

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

const Partner = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);

// University Schema
const universitySchema = new mongoose.Schema({
    name: String,
    country: String,
    course: String,
    tuitionFee: String,
    commission: Number
});

const University = mongoose.models.University || mongoose.model('University', universitySchema);

// --- AUTOMATIC TEST USER CREATION ---
// কানেকশন হওয়ার পর স্বয়ংক্রিয়ভাবে একটি পার্টনার ইউজার তৈরি হবে
mongoose.connection.once('open', async () => {
    try {
        const checkUser = await Partner.findOne({ email: 'admin@test.com' });
        if (!checkUser) {
            const testPartner = new Partner({
                name: "Test Admin",
                email: "admin@test.com",
                password: "123", // লগইনের জন্য পাসওয়ার্ড হবে ১২৩
                walletBalance: 500
            });
            await testPartner.save();
            console.log("🚀 Test Partner Created: admin@test.com / 123");
        }
    } catch (err) {
        console.log("Error during test user setup:", err);
    }
});

// --- ROUTES ---

// ১. লগইন রুট
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
        console.error("Login Route Error:", err);
        res.status(500).json({ error: "Internal Server Error" }); // ৫০০ এরর হ্যান্ডলিং
    }
});

// ২. ড্যাশবোর্ড রুট
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

// Render Port Configuration
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`📡 Server is running on port ${PORT}`);
});