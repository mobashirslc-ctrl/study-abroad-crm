const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Admin System Locked")).catch(err => console.log("DB Error:", err.message));

// --- Schemas & Models ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, contactNo: String, status: { type: String, default: 'Active' }, expiryDate: String
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    name: String, contact: String, status: { type: String, default: 'Pending' }, fileUrl: String
}));

const Withdrawal = mongoose.model('Withdrawal', new mongoose.Schema({
    partnerName: String, contactName: String, status: { type: String, default: 'Due' }
}));

const Compliance = mongoose.model('Compliance', new mongoose.Schema({
    name: String, contactNo: String, orgName: String, status: { type: String, default: 'Active' }
}));

// --- APIs ---
app.post('/api/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).send("Success"); } 
    catch (err) { res.status(500).send("Error"); }
});

app.get('/api/admin-full-data', async (req, res) => {
    const partners = await Partner.find();
    const students = await StudentFile.find();
    const withdrawals = await Withdrawal.find();
    const compliances = await Compliance.find();
    res.json({ partners, students, withdrawals, compliances });
});

app.patch('/api/update-partner/:id', async (req, res) => {
    try {
        const { status, expiryDate } = req.body;
        await Partner.findByIdAndUpdate(req.params.id, { status, expiryDate });
        res.status(200).send("Updated");
    } catch (err) { res.status(500).send("Failed"); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Live on " + PORT));