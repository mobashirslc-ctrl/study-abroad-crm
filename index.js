const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 1. DATABASE CONNECTION FIX
// Render ENV থেকে MONGODB_URI ব্যবহার করা হয়েছে
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/ihp_crm?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
.then(() => {
    console.log("IHP CRM: Data is Live & Database Connected Successfully");
    seedDummyData(); // ডাটাবেস কানেক্ট হলে Dummy ডাটা ইনজেক্ট করবে
})
.catch(err => {
    console.log("IHP CRM: DB Connection Failed! Error details ->", err.message);
});

// 2. SCHEMAS (LOCKED - 100% REQUIRED FIELDS)
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

// 3. API ENDPOINTS (SYNCHRONIZED WITH HTML)
app.post('/api/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Error Saving Data"); }
});

app.get('/api/get-universities', async (req, res) => { res.json(await University.find()); });
app.get('/api/partners', async (req, res) => { res.json(await Partner.find()); });

// Serve Admin Panel
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`System Locked on Port ${PORT}`));

// --- Dummy Data Seeder Logic ---
async function seedDummyData() {
    // University Dummy Data
    const uniCount = await University.countDocuments();
    if (uniCount === 0) {
        await University.create([
            { country: "Australia", uniName: "Monash University", degree: "UG", semesterFee: "35000", currency: "AUD DOLLAR" },
            { country: "Canada", uniName: "University of Toronto", degree: "PG", semesterFee: "28000", currency: "DOLLAR" }
        ]);
        console.log("University Dummy Data Added.");
    }

    // Partner Dummy Data
    const partnerCount = await Partner.countDocuments();
    if (partnerCount === 0) {
        await Partner.create([
            { name: "Global Ed Consultants", email: "info@globaled.com", status: "Active" },
            { name: "Nexus Abroad", email: "contact@nexusabroad.com", status: "Active" }
        ]);
        console.log("Partner Dummy Data Added.");
    }
}