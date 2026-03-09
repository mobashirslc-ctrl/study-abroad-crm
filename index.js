const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // Fixed: Bcrypt integrated to avoid image_2306b4.png error
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM System Locked")).catch(err => console.log(err));

// --- Schemas & Models (Admin 20+ Fields Locked) ---
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    contactNo: String,
    status: { type: String, default: 'Inactive' }, 
    expiryDate: String
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String, contact: String, status: { type: String, default: 'Pending' }, pdfUrl: String
}));

// --- Admin APIs (Connected to image_2de7fd.png) ---
app.post('/api/add-university', async (req, res) => {
    try { await new University(req.body).save(); res.status(200).send("Saved"); } 
    catch (err) { res.status(500).send("Error"); }
});

app.get('/api/admin-full-data', async (req, res) => {
    const partners = await Partner.find();
    const students = await StudentFile.find();
    res.json({ partners, students });
});

app.patch('/api/update-partner/:id', async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, req.body);
        res.status(200).send("Updated");
    } catch (err) { res.status(500).send("Failed"); }
});

// --- Partner Auth APIs ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await new Partner({ ...req.body, password: hashedPassword }).save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Error"); }
});

app.post('/api/partner/login', async (req, res) => {
    try {
        const partner = await Partner.findOne({ email: req.body.email });
        if (!partner || partner.status !== 'Active') return res.status(403).send("Inactive or Not Found");
        const match = await bcrypt.compare(req.body.password, partner.password);
        if (!match) return res.status(400).send("Invalid Credentials");
        res.status(200).json({ partnerId: partner._id, name: partner.name });
    } catch (err) { res.status(500).send("Error"); }
} );

// --- Student App Submit ---
app.post('/api/student/apply', async (req, res) => {
    try { await new StudentFile(req.body).save(); res.status(200).send("Submitted"); }
    catch (e) { res.status(500).send("Error"); }
});

// --- ROUTE FIX: Fixes image_229690.png Error ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner-dashboard.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server Live on ${PORT}`));