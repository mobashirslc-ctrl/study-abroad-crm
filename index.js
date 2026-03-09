const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // পাসওয়ার্ড এনক্রিপশনের জন্য
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI)
    .then(() => console.log("IHP CRM: System Secured & Locked"))
    .catch(err => console.log("Database Error:", err.message));

// --- MODELS & SCHEMAS ---

// ২০+ ফিল্ডের ইউনিভার্সিটি স্কিমা (Locked)
const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    languageType: String, academicScore: String, languageScore: String, studyGap: String, 
    semesterFee: String, currency: String, bankType: String, maritalStatus: String, 
    bankNameBD: String, loanAmount: String, partnerCommission: String
}));

// পার্টনার স্কিমা (Status & Auth Locked)
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    contactNo: String,
    status: { type: String, default: 'Inactive' }, // Default Inactive for admin approval
    expiryDate: String
}));

// স্টুডেন্ট ফাইল ট্র্যাকিং স্কিমা (Locked)
const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    studentName: String,
    contact: String,
    status: { type: String, default: 'Pending' },
    pdfUrl: String,
    appliedDate: { type: Date, default: Date.now }
}));

// --- APIs ---

// ১. ইউনিভার্সিটি সেভ (Admin)
app.post('/api/add-university', async (req, res) => {
    try {
        await new University(req.body).save();
        res.status(200).send("University Saved");
    } catch (err) { res.status(500).send("Error Saving Data"); }
});

// ২. পার্টনার রেজিস্ট্রেশন (Registration Phase)
app.post('/api/partner/register', async (req, res) => {
    try {
        const { name, email, password, contactNo } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await new Partner({ name, email, password: hashedPassword, contactNo }).save();
        res.status(200).send("Success");
    } catch (err) { res.status(500).send("Email exists or Error"); }
});

// ৩. পার্টনার লগইন (Status Active না থাকলে এরর দিবে)
app.post('/api/partner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await Partner.findOne({ email });
        if (!partner) return res.status(404).send("Account not found");
        if (partner.status !== 'Active') return res.status(403).send("Account Inactive. Contact Admin.");
        
        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) return res.status(400).send("Invalid Credentials");

        res.status(200).json({ partnerId: partner._id, name: partner.name });
    } catch (err) { res.status(500).send("Login Error"); }
});

// ৪. এডমিন ডাটা লোড (Partners, Universities, Students)
app.get('/api/admin-full-data', async (req, res) => {
    const partners = await Partner.find();
    const students = await StudentFile.find();
    res.json({ partners, students });
});

// ৫. পার্টনার আপডেট (Status/Expiry - Admin Control)
app.patch('/api/update-partner/:id', async (req, res) => {
    try {
        await Partner.findByIdAndUpdate(req.params.id, req.body);
        res.status(200).send("Updated Successfully");
    } catch (err) { res.status(500).send("Update Failed"); }
});

// ৬. স্টুডেন্ট ফাইল সাবমিশন (Partner Dashboard)
app.post('/api/student/apply', async (req, res) => {
    try {
        await new StudentFile(req.body).save();
        res.status(200).send("Application Submitted");
    } catch (err) { res.status(500).send("Submission Failed"); }
});

// --- ROUTES (FRONTEND MAPPING) ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner-dashboard.html')));

// Server Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`IHP CRM Live on Port ${PORT}`));