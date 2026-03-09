const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI)
    .then(() => console.log("IHP CRM: Database Connected Successfully"))
    .catch(err => console.error("DB Connection Error: ", err));

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
    status: { type: String, default: 'Inactive' },
    walletBalance: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String, studentContact: String, universityName: String,
    commissionAmount: Number, status: { type: String, default: 'File Opening' },
    createdAt: { type: Date, default: Date.now }
}));

// --- Partner Routes ---

// Login logic
app.post('/api/partner/login', async (req, res) => {
    try {
        const partner = await Partner.findOne({ email: req.body.email });
        if (!partner) return res.status(404).json({ message: "User not found" });
        if (partner.status !== 'Active') return res.status(403).json({ message: "Waiting for Admin Approval" });
        res.json(partner);
    } catch (e) { res.status(500).send("Server Error"); }
});

// Assessment Search
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

// File Opening & Commission
app.post('/api/partner/open-file', async (req, res) => {
    try {
        const { partnerId, studentName, studentContact, uniName, commission } = req.body;
        const newFile = new StudentFile({ partnerId, studentName, studentContact, universityName: uniName, commissionAmount: commission });
        await newFile.save();
        await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });
        res.json({ success: true });
    } catch (e) { res.status(500).send("Error"); }
});

// Tracking
app.get('/api/partner/my-files/:id', async (req, res) => {
    try {
        const files = await StudentFile.find({ partnerId: req.params.id }).sort({ createdAt: -1 });
        res.json(files);
    } catch (e) { res.status(500).json([]); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));