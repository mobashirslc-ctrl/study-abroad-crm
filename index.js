const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ADMIN:Gorun2026@cluster0.8qewhkr.mongodb.net/StudyAbroadCRM?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("OK: MongoDB Connected Successfully to Atlas"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// --- Database Models ---

// ১. স্টুডেন্ট মডেল (আগে যেটা ছিল)
const StudentSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    cgpa: Number,
    ielts: Number
});
const Student = mongoose.model('Student', StudentSchema);

// ২. ইউনিভার্সিটি মডেল (অ্যাডমিন প্যানেলের জন্য নতুন)
const UniversitySchema = new mongoose.Schema({
    name: String,
    country: String,
    minCGPA: Number,
    minIELTS: Number
});
const University = mongoose.model('University', UniversitySchema);

// --- API Routes ---

// সার্ভার চেক করার রুট
app.get('/', (req, res) => {
    res.send("<h1>Study Abroad CRM Server is Live!</h1><p>The backend is working perfectly.</p>");
});

// এডমিন প্যানেল থেকে ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).json({ message: "University added successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// পার্টনার পোর্টালের জন্য সব ইউনিভার্সিটি দেখার API
app.get('/api/universities', async (req, res) => {
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// স্টুডেন্ট অ্যাসেসমেন্ট সেভ করার API
app.post('/api/students', async (req, res) => {
    try {
        const newStudent = new Student(req.body);
        await newStudent.save();
        res.status(201).json({ message: "Student record saved!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});