const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database URI fix for Render
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
.then(() => console.log("IHP CRM: Admin System Locked & Online"))
.catch(err => console.log("DB Error -> ", err.message));

// University Schema (Locked with all fields)
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
}));

// Admin APIs
app.post('/api/add-university', async (req, res) => {
    try { const newUni = new University(req.body); await newUni.save(); res.status(200).send("Success"); }
    catch (err) { res.status(500).send("Error"); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Admin System Locked on Port " + PORT));