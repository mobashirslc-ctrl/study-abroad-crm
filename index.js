const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs'); // Render error fix
const app = express();

app.use(express.json());
app.use(express.static('public'));

// DB Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("System Locked & Connected")).catch(err => console.log(err));

// --- Models ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: String,
    contactNo: String, status: { type: String, default: 'Inactive' }, expiryDate: String
}));

const StudentFile = mongoose.model('StudentFile', new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId, studentName: String, 
    contact: String, status: { type: String, default: 'Pending' }, pdfUrl: String
}));

// --- API Fixed for Routing ---
app.post('/api/partner/login', async (req, res) => {
    const partner = await Partner.findOne({ email: req.body.email });
    if (!partner || partner.status !== 'Active') return res.status(403).send("Inactive Account");
    const match = await bcrypt.compare(req.body.password, partner.password);
    if (!match) return res.status(400).send("Wrong Password");
    res.status(200).json({ partnerId: partner._id, name: partner.name });
});

// --- ROUTES MAPPING (Fixed as per image_223176.png) ---
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/partner.html')); // ফাইলের নাম partner.html এ ফিক্সড
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Live on " + PORT));