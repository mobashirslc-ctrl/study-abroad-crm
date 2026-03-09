const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); 
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("System Locked & Connected")).catch(err => console.log(err));

// --- Models (Synced with Admin) ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    contactNo: String, status: { type: String, default: 'Inactive' }, 
    expiryDate: { type: String, default: 'Pending' },
    totalCommission: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, contact: String,
    university: String, pdfUrl: String, visaStatus: { type: String, default: 'Pending' },
    complianceMember: { type: String, default: 'In Review' },
    appliedDate: { type: Date, default: Date.now }
}));

// --- APIs ---
app.post('/api/uni-search', async (req, res) => {
    const { country, degree, languageType } = req.body;
    const results = await University.find({ country, degree, languageType });
    res.json(results);
});

app.get('/api/my-students/:id', async (req, res) => {
    const students = await StudentFile.find({ partnerId: req.params.id });
    res.json(students);
});

// --- Routes (Fixed: image_229690.png) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Live on " + PORT));