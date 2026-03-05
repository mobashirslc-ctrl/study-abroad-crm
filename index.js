const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- 1. MongoDB Connection ---
// আপনার দেওয়া ইউজারনেম: admin2 এবং পাসওয়ার্ড: CRM2026 এখানে বসানো হয়েছে
const MONGO_URI = "mongodb+srv://admin2:CRM2026@cluster0.8qewhkr.mongodb.net/?appName=Cluster0"; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// --- 2. Database Models (Schemas) ---

// University Model (নতুন সব কমার্শিয়াল ফিল্ডসহ)
const universitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },          
    minGPA: { type: Number, required: true },           
    minIELTS: { type: Number, required: true },         
    intake: { type: String, required: true },           
    maritalStatus: { type: String, default: 'Both' },    
    requiredBankAmount: { type: Number, default: 0 },   
    currency: { type: String, default: 'BDT' },         
    commissionAmount: { type: Number, default: 0 }      
});
const University = mongoose.model('University', universitySchema);

// Partner Model (Wallet, Subscription এবং Role সহ)
const partnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },        // roles: admin, partner, compliance
    status: { type: String, default: 'pending' },      // status: pending, active, blocked
    expiryDate: { type: Date },                        
    walletBalance: { type: Number, default: 0 },
    pendingCommission: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Partner = mongoose.model('Partner', partnerSchema);

// Student Application Model (কমিশন ট্র্যাক করার জন্য)
const applicationSchema = new mongoose.Schema({
    partnerEmail: String,
    studentName: String,
    universityName: String,
    status: { type: String, default: 'Pending' },      
    commissionStatus: { type: String, default: 'Not Paid' }, 
    commissionAmount: Number,
    submittedAt: { type: Date, default: Date.now }
});
const Application = mongoose.model('Application', applicationSchema);


// --- 3. API Routes ---

// A. Partner Registration (ডিফল্টভাবে ৭ দিন ট্রায়াল পাবে)
app.post('/api/partners/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await Partner.findOne({ email });
        if (existing) return res.status(400).json({ message: "Email already exists" });

        let trialDate = new Date();
        trialDate.setDate(trialDate.getDate() + 7);

        const newPartner = new Partner({ name, email, password, expiryDate: trialDate });
        await newPartner.save();
        res.json({ success: true, message: "Registration successful! Wait for Admin Approval." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// B. Login (Role এবং Status চেক করবে)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Partner.findOne({ email, password });

        if (!user) return res.status(401).json({ message: "Invalid credentials" });
        
        // শুধু একটিভ ইউজার অথবা অ্যাডমিন লগইন করতে পারবে
        if (user.status !== 'active' && user.role !== 'admin') {
            return res.status(403).json({ message: `Your account is ${user.status}. Contact Admin.` });
        }

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// C. Eligibility Search (নতুন লজিক: Country, Bank, Intake, Marital Status)
app.post('/api/check-eligibility', async (req, res) => {
    try {
        const { gpa, ielts, country, maritalStatus, bankAmount, intake } = req.body;
        
        const query = {
            country: country,
            minGPA: { $lte: parseFloat(gpa) },
            minIELTS: { $lte: parseFloat(ielts) },
            intake: intake,
            requiredBankAmount: { $lte: parseFloat(bankAmount) }
        };

        if (maritalStatus !== 'Both') {
            query.$or = [{ maritalStatus: 'Both' }, { maritalStatus: maritalStatus }];
        }

        const matchingUniversities = await University.find(query);
        res.json({ success: true, data: matchingUniversities });
    } catch (err) {
        res.status(500).json({ error: "Search failed!" });
    }
});

// D. Add University (Admin Only)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true, message: "University added successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// E. Admin: Get Partner List
app.get('/api/admin/partners', async (req, res) => {
    try {
        const partners = await Partner.find({ role: 'partner' });
        res.json(partners);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// F. Admin: Update Partner Status (Approve/Block/Expiry)
app.post('/api/admin/update-partner', async (req, res) => {
    try {
        const { id, status, expiryDate } = req.body;
        await Partner.findByIdAndUpdate(id, { status, expiryDate });
        res.json({ success: true, message: "Partner record updated!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// G. Compliance: Release Commission to Partner Wallet
app.post('/api/compliance/release-commission', async (req, res) => {
    try {
        const { appId, partnerEmail, amount } = req.body;
        
        // ফাইল এবং পেমেন্ট স্ট্যাটাস আপডেট
        await Application.findByIdAndUpdate(appId, { commissionStatus: 'Paid', status: 'Approved' });
        
        // পার্টনারের ওয়ালেটে টাকা যোগ করা
        await Partner.findOneAndUpdate(
            { email: partnerEmail },
            { $inc: { walletBalance: amount } }
        );

        res.json({ success: true, message: "Commission added to Partner Wallet" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Port Configuration ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));