const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log('✅ IHP CRM Engine Connected')).catch(err => console.log(err));

// --- Schemas ---

const applicationSchema = new mongoose.Schema({
    partnerName: String,
    studentName: String,
    universityName: String, 
    commission: Number,
    status: { type: String, default: 'File Received' },
    complianceOfficer: { name: { type: String, default: 'Sarah Jenkins' }, role: { type: String, default: 'Compliance Manager' } }
}, { timestamps: true });

const partnerSchema = new mongoose.Schema({
    name: String,
    wallet: {
        totalEarnings: { type: Number, default: 0 },
        withdrawn: { type: Number, default: 0 }
    },
    withdrawRequests: [{
        amount: Number,
        method: String, // bKash, Nagad, Bank
        details: String,
        status: { type: String, default: 'Pending' },
        date: { type: Date, default: Date.now }
    }]
});

const University = mongoose.model('University', mongoose.Schema({
    name: String, country: String, location: String, degree: String, 
    minGPA: Number, partnerCommission: Number, scholarship: String
}));
const Application = mongoose.model('Application', applicationSchema);
const Partner = mongoose.model('Partner', partnerSchema);

// --- API Endpoints ---

// ১. সার্চ এবং অ্যাপ্লিকেশন (আগের মতো)
app.post('/api/check-eligibility', async (req, res) => {
    const { country, gpa } = req.body;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (gpa) query.minGPA = { $lte: parseFloat(gpa) };
    const results = await University.find(query);
    res.json({ success: true, data: results });
});

app.post('/api/applications', async (req, res) => {
    const appData = new Application(req.body);
    await appData.save();
    res.json({ success: true });
});

app.get('/api/applications/:name', async (req, res) => {
    const apps = await Application.find({ partnerName: req.params.name }).sort({ createdAt: -1 });
    res.json(apps);
});

// ২. ওয়ালেট এবং উইথড্র সিস্টেম
app.get('/api/partner/wallet/:name', async (req, res) => {
    let partner = await Partner.findOne({ name: req.params.name });
    if (!partner) {
        partner = new Partner({ name: req.params.name, wallet: { totalEarnings: 0, withdrawn: 0 } });
        await partner.save();
    }
    res.json(partner);
});

app.post('/api/partner/withdraw', async (req, res) => {
    const { partnerName, amount, method, details } = req.body;
    const partner = await Partner.findOne({ name: partnerName });
    if (partner) {
        partner.withdrawRequests.push({ amount, method, details });
        await partner.save();
        res.json({ success: true, message: "Withdraw request sent!" });
    } else {
        res.status(404).json({ success: false });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 IHP CRM Server Active`));