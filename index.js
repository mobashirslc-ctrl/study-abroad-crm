const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// Password CRM2026 ব্যবহার করা হয়েছে। নিশ্চিত করুন আপনি এটি Atlas-এ সেট করেছেন।
const mongoURI = 'mongodb+srv://admin:CRM2026@cluster0.8qewhkr.mongodb.net/crm_database?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully")) 
    .catch(err => {
        console.log("❌ MongoDB Connection Error: ", err.message); 
    });

// --- SCHEMAS & MODELS ---

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

const universitySchema = new mongoose.Schema({
    name: String,
    country: String,
    course: String,
    tuitionFee: String,
    commission: Number
});

const University = mongoose.models.University || mongoose.model('University', universitySchema);

// --- AUTOMATIC TEST USER CREATION ---
mongoose.connection.once('open', async () => {
    try {
        const checkUser = await Partner.findOne({ email: 'admin@test.com' });
        if (!checkUser) {
            const testPartner = new Partner({
                name: "Test Admin",
                email: "admin@test.com",
                password: "123", 
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
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

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

app.get('/api/universities', async (req, res) => {
    try {
        const universities = await University.find();
        res.json(universities);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch universities" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`📡 Server is running on port ${PORT}`);
});