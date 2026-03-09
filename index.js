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
    status: { type: String, default: 'Inactive' }, 
    walletBalance: { type: Number, default: 0 }
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String, studentContact: String, universityName: String,
    commissionAmount: Number, status: { type: String, default: 'File Opening' },
    createdAt: { type: Date, default: Date.now }
}));

// --- Routes & APIs ---

// Fix: Direct Route to Login (Root) and Partner Dashboard
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// Assessment Search API (Part 2)
app.post('/api/partner/assessment', async (req, res) => {
    try {
        const { country, degree, languageType } = req.body;
        let query = {};
        if (country) query.country = new