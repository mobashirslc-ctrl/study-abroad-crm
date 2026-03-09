const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Systems Connected")).catch(err => console.log(err));

// --- Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    appFee: String, deadline: String, scholarship: String, workRights: String, location: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contact: String, orgName: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, walletBalance: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String, studentContact: String, universityName: String,
    commissionAmount: Number, status: { type: String, default: 'File Opening' },
    createdAt: { type: Date, default: Date.now }
}));

// --- Routes & APIs ---

// Fix for Login and Partner Route
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// Assessment Search (Part 2) - Fixed Syntax Error
app.post('/api/partner/assessment', async (req, res) => {
    try {
        const { country, degree, languageType } = req.body;
        let query = {};
        if (country) query.country = new RegExp(country, 'i');
        if (degree) query.degree = degree;
        if (languageType) query.languageType = languageType;
        const results = await University.find(query);
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

// File Opening & Auto-Wallet Commission (Part 3)
app.post('/api/partner/open-file', async (req, res) => {
    try {
        const { partnerId, studentName, studentContact, universityName, commissionAmount } = req.body;
        const newFile = new StudentFile({ partnerId, studentName, studentContact, universityName, commissionAmount });
        await newFile.save();
        await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commissionAmount } });
        res.status(200).json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fetch Files for Tracking
app.get('/api/partner/my-files/:id', async (req, res) => {
    try {
        const files = await StudentFile.find({ partnerId: req.params.id }).sort({ createdAt: -1 });
        res.json(files);
    } catch (e) { res.status(500).json([]); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));