const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DB CONNECTION ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => console.log("✅ DB Locked & Connected")).catch(err => console.log(err));

// --- SCHEMAS (LOCKED) ---
const University = mongoose.model('University', new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, duration: String,
    currency: String, semesterFee: String, totalFee: String,
    bankNameBD: String, loanAmount: String, partnerCommission: Number,
    minGpa: String, ieltsScore: String, pteScore: String, duolingoScore: String,
    moiAvailable: String, maritalStatus: String, gapAcceptance: String,
    bankType: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    subStatus: { type: String, default: 'Inactive' },
    subAmount: { type: Number, default: 0 },
    subExpireDate: { type: String, default: 'N/A' }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, passportNo: String,
    studentEmail: String, uniName: String, commission: Number,
    status: { type: String, default: 'Observation' }, 
    date: { type: Date, default: Date.now }
}));

const Withdraw = mongoose.model('Withdraw', new mongoose.Schema({
    partnerId: String, partnerName: String, amount: Number,
    method: String, accountNo: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
}));

// --- APIS (LOCKED REQUIREMENTS) ---
app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({email: req.body.email, pass: req.body.pass});
    if(p && p.status === 'Active') res.json({id: p._id, name: p.name});
    else res.status(401).json({msg: "Access Denied"});
});

app.get('/api/partner/details/:id', async (req, res) => res.json(await Partner.findById(req.params.id)));

// কমিশন লজিক: ফাইল সাবমিট করলে শুধু পেন্ডিং বক্সে যোগ হবে
app.post('/api/partner/submit-file', async (req, res) => {
    try {
        const newFile = new StudentFile(req.body);
        await newFile.save();
        await Partner.findByIdAndUpdate(req.body.partnerId, { 
            $inc: { pendingBalance: req.body.commission } 
        });
        res.json({ msg: "Success" });
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/partner/withdraw', async (req, res) => {
    const { partnerId, amount, method, accountNo } = req.body;
    const partner = await Partner.findById(partnerId);
    if (!partner || partner.walletBalance < amount) return res.status(400).json({ msg: "Insufficient Balance" });
    partner.walletBalance -= amount;
    await partner.save();
    const request = new Withdraw({ partnerId, partnerName: partner.name, amount, method, accountNo });
    await request.save();
    res.json({ msg: "Withdraw Request Sent!" });
});

app.get('/api/partner/history/:id', async (req, res) => res.json(await StudentFile.find({partnerId: req.params.id}).sort({date:-1})));
app.get('/api/universities', async (req, res) => res.json(await University.find()));

// --- PORT FIX FOR RENDER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});