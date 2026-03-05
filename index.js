const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Engine Connected'));

// --- University Schema ---
const universitySchema = new mongoose.Schema({
    name: String, country: String, location: String, degree: String,
    intake: String, semesterFee: Number, languageType: String,
    langScore: Number, minGPA: Number, spouseAllowed: String,
    partnerCommission: Number, scholarship: String
});

// --- Partner Schema ---
const partnerSchema = new mongoose.Schema({
    name: String, subscriptionStatus: { type: String, default: 'Inactive' },
    subscriptionAmount: { type: Number, default: 0 },
    wallet: { totalEarnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 } }
});

const University = mongoose.model('University', universitySchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- Admin Endpoints ---

// ১. ইউনিভার্সিটি অ্যাড করা (Fixing the 404 error)
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ২. সব পার্টনার লিস্ট দেখা
app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

// ৩. সাবস্ক্রিপশন আপডেট করা
app.post('/api/admin/update-subscription', async (req, res) => {
    const { id, status, amount } = req.body;
    await Partner.findByIdAndUpdate(id, { subscriptionStatus: status, subscriptionAmount: amount });
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Admin Engine Running`));