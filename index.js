const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// আগের মতোই সব কনফিগারেশন
app.use(cors());
app.use(express.json());

const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Connected')).catch(err => console.log(err));

// --- Schemas (আপনার আগের সব ফিল্ড ঠিক রাখা হয়েছে) ---
const applicationSchema = new mongoose.Schema({
    partnerName: String, studentName: String, universityName: String, commission: Number,
    status: { type: String, default: 'File Received' },
    complianceOfficer: { name: { type: String, default: 'Sarah Jenkins' }, role: { type: String, default: 'Compliance Manager' } }
}, { timestamps: true });

const partnerSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    wallet: { totalEarnings: { type: Number, default: 0 }, withdrawn: { type: Number, default: 0 } },
    withdrawRequests: [{ amount: Number, method: String, details: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now } }]
});

const Application = mongoose.model('Application', applicationSchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- API Endpoints (আগের সব রুট অক্ষত আছে) ---

app.get('/api/partner/wallet/:name', async (req, res) => {
    try {
        let partner = await Partner.findOne({ name: req.params.name });
        if (!partner) partner = await Partner.create({ name: req.params.name });
        res.json(partner);
    } catch (e) { res.status(500).send(e); }
});

app.post('/api/partner/withdraw', async (req, res) => {
    try {
        const { partnerName, amount, method, details } = req.body;
        await Partner.findOneAndUpdate({ name: partnerName }, { $push: { withdrawRequests: { amount, method, details } } });
        res.json({ success: true });
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/applications/:name', async (req, res) => {
    const apps = await Application.find({ partnerName: req.params.name }).sort({ createdAt: -1 });
    res.json(apps);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 IHP Server Running`));