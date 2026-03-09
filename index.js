const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ১. ডাটাবেস লকিং (আপনার সব ২১টি রিকয়ারমেন্ট এখানে লক করা)
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

// ২. ডাটা সেভ করার এপিআই (Admin Entry)
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Data Saved and Locked!");
    } catch (err) {
        res.status(500).send("Error saving data: " + err.message);
    }
});

// ৩. সার্চ এপিআই (Partner Assessment)
app.get('/api/search-uni', async (req, res) => {
    const { country, degree } = req.query;
    let query = {};
    if (country) query.country = new RegExp(country, 'i');
    if (degree && degree !== 'All') query.degree = degree;
    const results = await University.find(query);
    res.json(results);
});

// ৪. পারমানেন্ট লিঙ্ক লকিং
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("System Locked & Running"));