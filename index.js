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
mongoose.connect(mongoURI).then(() => console.log("✅ DB Locked")).catch(err => console.log(err));

// --- SCHEMAS ---
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
    pendingBalance: { type: Number, default: 0 } // নিউ ফিল্ড: পেন্ডিং কমিশন
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, passportNo: String,
    studentEmail: String, uniName: String, commission: Number,
    status: { type: String, default: 'Pending' }, 
    complianceStatus: { type: String, default: 'File Received' },
    date: { type: Date, default: Date.now }
}));

// --- ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- API: SUBMIT FILE (Increments Pending Balance) ---
app.post('/api/partner/submit-file', async (req, res) => {
    const newFile = new StudentFile(req.body);
    await newFile.save();
    // পার্টনারের পেন্ডিং বক্সে টাকা যোগ করা
    await Partner.findByIdAndUpdate(req.body.partnerId, { $inc: { pendingBalance: req.body.commission } });
    res.json({ msg: "Success" });
});

// --- API: COMPLIANCE VERIFICATION (Pending -> Final) ---
app.put('/api/admin/verify-file/:fileId', async (req, res) => {
    const { action } = req.body; 
    const file = await StudentFile.findById(req.params.fileId);
    if (!file || file.status !== 'Pending') return res.status(400).send();

    if (action === 'Fix') {
        file.status = 'Fixed';
        file.complianceStatus = 'File Opening Start';
        // পেন্ডিং থেকে মাইনাস করে মেইন ওয়ালেটে প্লাস করা
        await Partner.findByIdAndUpdate(file.partnerId, { 
            $inc: { pendingBalance: -file.commission, walletBalance: file.commission } 
        });
    } else {
        file.status = 'Rejected';
        file.complianceStatus = 'File Rejected';
        // পেন্ডিং থেকে মাইনাস করা (যেহেতু রিজেক্ট হয়েছে)
        await Partner.findByIdAndUpdate(file.partnerId, { $inc: { pendingBalance: -file.commission } });
    }
    await file.save();
    res.json({ msg: "Success" });
});

app.get('/api/partner/details/:id', async (req, res) => res.json(await Partner.findById(req.params.id)));
app.get('/api/partner/history/:id', async (req, res) => res.json(await StudentFile.find({partnerId: req.params.id}).sort({date:-1})));
app.get('/api/universities', async (req, res) => res.json(await University.find()));

// ... [Existing Login/Register/Admin APIs locked]
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Locked on ${PORT}`));