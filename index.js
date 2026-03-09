const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || "YOUR_MONGODB_URI_HERE";
mongoose.connect(mongoURI).then(() => console.log("DB Connected")).catch(err => console.log(err));

// University Schema (Locked)
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

// Partner Schema (For Management)
const partnerSchema = new mongoose.Schema({
    name: String,
    email: String,
    status: { type: String, default: 'Active' },
    expiryDate: Date
});
const Partner = mongoose.model('Partner', partnerSchema);

// APIs
app.post('/api/add-university', async (req, res) => {
    try { const newUni = new University(req.body); await newUni.save(); res.status(200).send("Success"); }
    catch (err) { res.status(500).send("Error"); }
});

app.get('/api/partners', async (req, res) => {
    const partners = await Partner.find();
    res.json(partners);
});

app.post('/api/update-partner', async (req, res) => {
    const { id, status, expiryDate } = req.body;
    await Partner.findByIdAndUpdate(id, { status, expiryDate });
    res.send("Updated");
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Running"));