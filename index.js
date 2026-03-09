const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// DB Connection (Render ENV)
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Admin System Locked")).catch(err => console.log(err));

// --- Models ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contactNo: String, email: String, status: { type: String, default: 'Active' }, expiryDate: Date
}));

// Student & Commission Schema
const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    studentName: String, partnerName: String, partnerId: String,
    university: String, status: { type: String, default: 'Pending' }, // Controlled by Compliance/Admin
    commissionAmount: Number,
    commissionStatus: { type: String, default: 'Uncollected' } // Uncollected -> Collected -> Paid
}));

const WithdrawRequest = mongoose.model('WithdrawRequest', new mongoose.Schema({
    partnerName: String, amount: Number, status: { type: String, default: 'Pending' }, // Pending -> Paid
    requestDate: { type: Date, default: Date.now }
}));

// --- Admin APIs ---

// University Save
app.post('/api/add-university', async (req, res) => {
    try { const newUni = new University(req.body); await newUni.save(); res.status(200).send("Success"); }
    catch (err) { res.status(500).send("Error"); }
});

// Partner Update
app.get('/api/partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/update-partner', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status, expiryDate: req.body.expiryDate });
    res.json({message: "Success"});
});

// Student Tracking API (For Admin & Compliance)
app.get('/api/student-tracking', async (req, res) => res.json(await StudentFile.find()));

// Payment / Withdraw Request API
app.get('/api/withdraw-requests', async (req, res) => res.json(await WithdrawRequest.find()));
app.post('/api/pay-commission', async (req, res) => {
    const { requestId } = req.body;
    await WithdrawRequest.findByIdAndUpdate(requestId, { status: 'Paid' });
    res.json({message: "Payment Successful"});
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Admin Server Running"));