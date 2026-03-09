const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: PART 2 SYNCED")).catch(err => console.log(err));

// --- Updated Schemas ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: { type: Number, default: 0 },
    appFee: String, deadline: String, scholarship: String, workRights: String, location: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, 
    contact: String, 
    orgName: String, 
    email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, 
    expiryDate: Date,
    walletBalance: { type: Number, default: 0 }
}));

// --- APIs ---
app.post('/api/admin/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/partners', async (req, res) => {
    try { const partners = await Partner.find(); res.json(partners); }
    catch (e) { res.status(500).send("Error fetching partners"); }
});

app.patch('/api/admin/update-partner/:id', async (req, res) => {
    try {
        const { status, expiryDate, name, contact, orgName } = req.body;
        await Partner.findByIdAndUpdate(req.params.id, { status, expiryDate, name, contact, orgName });
        res.json({ success: true });
    } catch (e) { res.status(500).send("Update failed"); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Active on ${PORT}`));