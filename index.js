const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// MongoDB Schema (Design image_3b137e.png অনুযায়ী ২১টি ফিল্ড লক করা)
const universitySchema = new mongoose.Schema({
    country: String,
    uniName: String,
    courseName: String,
    intake: String,
    degree: String,
    languageType: String,
    academicScore: String,
    languageScore: String,
    studyGap: String,
    semesterFee: String,
    currency: String,
    bankType: String,
    maritalStatus: String,
    bankNameBD: String,
    loanAmount: String,
    partnerCommission: String
});

const University = mongoose.model('University', universitySchema);

// ডাটা সেভ করার সঠিক API Endpoint
app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Data Locked Successfully");
    } catch (err) {
        res.status(500).send("Server Error: " + err.message);
    }
});

// রাউট লকিং
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("IHP CRM System Locked & Running"));