const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware - পাথের জন্য path.resolve() ব্যবহার করা হয়েছে
const __root = path.resolve();
app.use(express.json());
app.use(express.static(path.join(__root, 'public')));

// Database Models
const universitySchema = new mongoose.Schema({
    country: String, name: String, location: String, courses: String,
    degree: { type: String, enum: ['UG', 'PG', 'DIPLOMA', 'PHD', 'RESEARCH'] },
    semesterFee: Number, currency: { type: String, enum: ['USD', 'AUD', 'EUR', 'BDT', 'CAD', 'GBP'] },
    languageRequired: { type: String, enum: ['IELTS', 'PTE', 'DUOLINGO'] },
    minLanguageScore: String, minGPA: String, intake: String, scholarship: String,
    partnerCommission: Number, bankName: String, loanAmount: Number,
    bankAmountRequired: Number, bankType: { type: String, enum: ['FDR', 'Savings'] },
    maritalCondition: { type: String, enum: ['Single', 'With Spouse'] }
});
const University = mongoose.model('University', universitySchema);

// Permanent Links - সরাসরি public ফোল্ডার থেকে ফাইল পাঠানো
app.get('/admin', (req, res) => res.sendFile(path.join(__root, 'public/admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__root, 'public/partner.html')));
app.get('/compliance', (req, res) => res.sendFile(path.join(__root, 'public/compliance.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__root, 'public/student.html')));

// API Endpoints
app.post('/api/admin/add-university', async (req, res) => {
    try {
        const uni = new University(req.body);
        await uni.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/search-university', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Database Connection
const DB_USER = "IHPCRM"; 
const DB_PASS = "ihp2026";
const dbURI = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.8qewhkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const PORT = process.env.PORT || 3000;
mongoose.connect(dbURI)
    .then(() => {
        console.log("🔥 Connected to MongoDB Cloud Successfully!");
        app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
    })
    .catch(err => console.log("❌ DB Error: ", err));