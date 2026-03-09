const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Render ENV 'MONGODB_URI'
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
.then(() => console.log("IHP CRM: Database Connected Successfully"))
.catch(err => console.log("DB Error: ", err.message));

// ২০+ ফিল্ডের ইউনিভার্সিটি স্কিমা (Locked)
const universitySchema = new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String,
    degree: String, languageType: String, academicScore: String, languageScore: String,
    studyGap: String, semesterFee: String, currency: String, bankType: String,
    maritalStatus: String, bankNameBD: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', universitySchema);

// পার্টনার স্কিমা (Contact No সহ)
const partnerSchema = new mongoose.Schema({
    name: String,
    contactNo: String,
    email: String,
    status: { type: String, default: 'Active' },
    expiryDate: Date
});
const Partner = mongoose.model('Partner', partnerSchema);

// --- APIs ---

// ইউনিভার্সিটি সেভ API
app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Error"); }
});

// পার্টনার লিস্ট লোড API
app.get('/api/partners', async (req, res) => {
    try {
        const partners = await Partner.find();
        res.json(partners);
    } catch (e) { res.status(500).send("Error"); }
});

// পার্টনার আপডেট API (Fixed Logic)
app.post('/api/update-partner', async (req, res) => {
    try {
        const { id, status, expiryDate } = req.body;
        await Partner.findByIdAndUpdate(id, { status, expiryDate });
        res.status(200).json({ message: "Success" });
    } catch (err) { res.status(500).json({ message: "Update Failed" }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Admin System Locked on Port " + PORT));