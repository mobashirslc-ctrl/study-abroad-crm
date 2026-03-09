const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // Fixed: Module now integrated
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Connection Lock
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: System Secured & Locked")).catch(err => console.log(err));

// --- Schemas (Admin + Partner + Student) ---
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

// --- APIs: Registration & Login ---
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, password, contactNo } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new Partner({ name, email, password: hashedPassword, contactNo }).save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Error: Email exists"); }
});

app.post('/api/partner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await Partner.findOne({ email });
        if (!partner || partner.status !== 'Active') return res.status(403).send("Unauthorized or Inactive");
        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) return res.status(400).send("Wrong Password");
        res.status(200).json({ id: partner._id, name: partner.name });
    } catch (err) { res.status(500).send("Login Failed"); }
});

// --- Admin APIs (Locked for 20+ Fields) ---
app.post('/api/add-university', async (req, res) => {
    await new University(req.body).save();
    res.status(200).send("Saved");
});

app.get('/api/admin-full-data', async (req, res) => {
    const partners = await Partner.find();
    res.json({ partners });
});

app.patch('/api/update-partner/:id', async (req, res) => {
    await Partner.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).send("Updated");
});

// Routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Active"));