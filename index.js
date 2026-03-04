const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Render-এ পোর্ট অটোমেটিক সেট করার জন্য এটি জরুরি
const PORT = process.env.PORT || 10000;

// ১. Middleware (আপনার ফ্রন্টএন্ড থেকে ডাটা নেওয়ার জন্য)
app.use(cors({ origin: "*" })); 
app.use(express.json());

// ২. MongoDB Connection (আপনার দেওয়া লিঙ্কটি এখানে বসানো হয়েছে)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ADMIN:Gorun2026@cluster0.8qewhkr.mongodb.net/StudyAbroadCRM?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("OK: MongoDB Connected Successfully to Atlas"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// ৩. একটি টেস্ট রুট (লিঙ্ক চেক করার জন্য)
app.get('/', (req, res) => {
    res.send("<h1>Study Abroad CRM Server is Live!</h1><p>The backend is working perfectly.</p>");
});

// ৪. আপনার ডাটা সেভ করার একটি উদাহরণ API (যদি প্রয়োজন হয়)
app.post('/api/contact', async (req, res) => {
    try {
        console.log("Data Received:", req.body);
        res.status(200).json({ message: "Data received successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// ৫. সার্ভার চালু করা
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});