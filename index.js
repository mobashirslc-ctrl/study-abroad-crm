const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Render এর Environment Variable 'MONGODB_URI' এর সাথে সরাসরি কানেক্ট করা হয়েছে
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
.then(() => console.log("IHP CRM: Database Connected Successfully"))
.catch(err => console.log("IHP CRM: DB Connection Error -> ", err.message));

// ২০+ ফিল্ডের পার্মানেন্ট স্কিমা (Locked)
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

const partnerSchema = new mongoose.Schema({
    name: String, email: String, status: { type: String, default: 'Active' }, expiryDate: Date
});
const Partner = mongoose.model('Partner', partnerSchema);

// API Endpoints
app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Error Saving Data"); }
});

app.get('/api/partners', async (req, res) => { res.json(await Partner.find()); });
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Running on Port " + PORT));