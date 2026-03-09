const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Secure Connection Established")).catch(err => console.log(err));

// --- Schemas (Required Fields Fixed) ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 }
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, contact: String,
    status: { type: String, default: 'Inactive' }, expiryDate: Date,
    walletBalance: { type: Number, default: 0 }, subscriptionStatus: { type: String, default: 'Due' }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, contact: String, university: String,
    commissionAmount: Number, visaStatus: { type: String, default: 'Pending' }, 
    complianceMember: String, appliedDate: { type: Date, default: Date.now }
}));

// --- Admin APIs (Management Controls) ---
app.post('/api/admin/add-university', async (req, res) => {
    try {
        await new University(req.body).save();
        res.status(200).json({ success: true, message: "University Saved with All Fields!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

// --- Partner APIs (Smart Assessment & Finance) ---
app.post('/api/partner/apply', async (req, res) => {
    try {
        const { partnerId, uniId, studentName, contact } = req.body;
        const uni = await University.findById(uniId);
        const partner = await Partner.findById(partnerId);
        
        // Auto-block if subscription expired
        if (new Date() > new Date(partner.expiryDate)) return res.status(403).send("Subscription Expired");

        partner.walletBalance += Number(uni.partnerCommission);
        await partner.save();
        const newFile = new StudentFile({ partnerId, studentName, contact, university: uni.uniName, commissionAmount: Number(uni.partnerCommission) });
        await newFile.save();
        res.status(200).json({ success: true, message: "File Opened Successfully!" });
    } catch (e) { res.status(500).send("Error"); }
});

// Search Logic
app.post('/api/uni-search', async (req, res) => {
    const { country, degree, languageType } = req.body;
    const results = await University.find({ country: new RegExp(country, 'i'), degree, languageType });
    res.json(results);
});

// Route Fixes for Admin & Partner
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`CRM Running on port ${PORT}`));