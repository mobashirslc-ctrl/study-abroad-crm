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
mongoose.connect(mongoURI).then(() => console.log("✅ DB Connected")).catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, courseName: String, degreeType: String,
    intake: String, semesterFee: String, partnerCommission: Number,
    bankNameBD: String, loanAmount: String, maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' },
    walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

const StudentFileSchema = new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, 
    passportNo: String, studentEmail: String,
    uniName: String, commission: Number,
    status: { type: String, default: 'Pending' }, 
    complianceStatus: { type: String, default: 'File Received' },
    date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

// --- ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- WALLET & FILE API (The Fix) ---
app.post('/api/partner/submit-file', async (req, res) => {
    try {
        const f = new StudentFile(req.body);
        await f.save();
        res.json({ msg: "Success" });
    } catch(e) { res.status(500).send(e); }
});

// পার্টনারের পেন্ডিং কমিশন হিসেব করার এপিআই
app.get('/api/partner/stats/:id', async (req, res) => {
    const files = await StudentFile.find({ partnerId: req.params.id });
    const pending = files.filter(f => f.status === 'Pending').reduce((acc, curr) => acc + curr.commission, 0);
    const partner = await Partner.findById(req.params.id);
    res.json({ pending, fixed: partner.walletBalance, history: files });
});

// --- ADMIN API ---
app.get('/api/admin/all-files', async (req, res) => res.json(await StudentFile.find().sort({date: -1})));
app.get('/api/admin/partners', async (req, res) => res.json(await Partner.find()));
app.get('/api/universities', async (req, res) => res.json(await University.find()));

app.put('/api/admin/verify-file/:fileId', async (req, res) => {
    const { action } = req.body; 
    const file = await StudentFile.findById(req.params.fileId);
    if (action === 'Fix') {
        file.status = 'Fixed';
        file.complianceStatus = 'File Opening Start';
        await Partner.findByIdAndUpdate(file.partnerId, { $inc: { walletBalance: file.commission } });
    } else {
        file.status = 'Rejected';
        file.complianceStatus = 'File Rejected';
    }
    await file.save();
    res.json({ msg: "Updated" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));