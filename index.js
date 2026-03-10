const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : null;

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.error("❌ DB Connection Error:", err.message));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    uniName: String, country: String, location: String, courseName: String,
    degreeType: String, intake: String, semesterFee: String, 
    partnerCommission: Number, bankNameBD: String, loanAmount: String, 
    maritalStatus: String
});
const University = mongoose.model('University', UniSchema);

const StudentFileSchema = new mongoose.Schema({
    partnerId: String, studentName: String, contactNo: String, passportNo: String,
    uniName: String, commission: Number, date: { type: Date, default: Date.now }
});
const StudentFile = mongoose.model('StudentFile', StudentFileSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' }, walletBalance: { type: Number, default: 0 }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

app.post('/api/partner/submit-file', async (req, res) => {
    try {
        const { partnerId, commission } = req.body;
        const newFile = new StudentFile(req.body);
        await newFile.save();
        await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });
        res.json({ msg: "Success" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/partner/details/:id', async (req, res) => res.json(await Partner.findById(req.params.id)));
app.get('/api/universities', async (req, res) => res.json(await University.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server locked and running on port ${PORT}`));