const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// MongoDB কানেকশন (নিশ্চিত করুন আপনার URI ঠিক আছে)
mongoose.connect(process.env.MONGO_URI || 'YOUR_MONGODB_URI_HERE')
.then(() => console.log("Database Connected"))
.catch(err => console.error("DB Error:", err));

// ২১টি ফিল্ডের পার্মানেন্ট স্কিমা (Locked)
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

// সেভ এপিআই (Fixed Endpoint)
app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Success");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// রাউট লকিং
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("System Running"));