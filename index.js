const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Render এর এনভায়রনমেন্ট ভেরিয়েবল সিঙ্ক
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
.then(() => console.log("IHP CRM: Admin System Locked & Online"))
.catch(err => console.log("DB Error -> ", err.message));

// ১০০% রিকয়ারমেন্ট ফিল্ড লকড স্কিমা
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contactNo: String, email: String, status: { type: String, default: 'Active' }, expiryDate: Date
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    studentName: String, partnerName: String, university: String, 
    status: { type: String, default: 'Pending' }, commissionStatus: { type: String, default: 'Uncollected' }
}));

const WithdrawRequest = mongoose.model('WithdrawRequest', new mongoose.Schema({
    partnerName: String, amount: Number, status: { type: String, default: 'Pending' }
}));

// APIs
app.post('/api/add-university', async (req, res) => {
    try { const newUni = new University(req.body); await newUni.save(); res.status(200).send("Success"); }
    catch (err) { res.status(500).send("Error"); }
});

app.get('/api/partners', async (req, res) => res.json(await Partner.find()));
app.post('/api/update-partner', async (req, res) => {
    await Partner.findByIdAndUpdate(req.body.id, { status: req.body.status, expiryDate: req.body.expiryDate });
    res.json({message: "Success"});
});

app.get('/api/student-tracking', async (req, res) => res.json(await StudentFile.find()));
app.get('/api/withdraw-requests', async (req, res) => res.json(await WithdrawRequest.find()));
app.post('/api/pay-commission', async (req, res) => {
    await WithdrawRequest.findByIdAndUpdate(req.body.requestId, { status: 'Paid' });
    res.json({message: "Paid"});
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("System Hard-Locked on Port " + PORT));