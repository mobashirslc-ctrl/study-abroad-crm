const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Schema (Updated)
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, orgName: String,
    status: { type: String, default: 'Inactive' }, // 'Active' হলে লগইন হবে
    walletBalance: { type: Number, default: 0 }
}));

const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, languageType: String, degree: String, 
    partnerCommission: Number, location: String, courseName: String, intake: String,
    semesterFee: String, bankNameBD: String, loanAmount: String, maritalStatus: String
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: String, studentName: String, studentContact: String, 
    university: String, status: { type: String, default: 'Pending' }, createdAt: { type: Date, default: Date.now }
}));

// --- Routes ---
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// Part 1: Registration Approval Logic
app.post('/api/partner/register', async (req, res) => {
    try { await new Partner(req.body).save(); res.json({ success: true, msg: "Waiting for Admin Approval" }); }
    catch(e) { res.status(400).send("Email exists"); }
});

// Part 2: Assessment Search
app.post('/api/partner/assessment', async (req, res) => {
    const { country, degree, lang } = req.body;
    let query = {};
    if(country) query.country = country;
    if(degree) query.degree = degree;
    const unis = await University.find(query);
    res.json(unis);
});

// Part 2: Auto Wallet & File Opening
app.post('/api/partner/open-file', async (req, res) => {
    const { partnerId, studentName, studentContact, uniName, commission } = req.body;
    await new StudentFile({ partnerId, studentName, studentContact, university: uniName }).save();
    await Partner.findByIdAndUpdate(partnerId, { $inc: { walletBalance: commission } });
    res.json({ success: true });
});

app.listen(10000, () => console.log("System Fixed and Running"));