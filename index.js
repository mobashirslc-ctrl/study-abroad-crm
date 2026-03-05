const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// সঠিক কানেকশন স্ট্রিং (admin:Stepup1234 ব্যবহার করে)
const mongoURI = "mongodb+srv://admin:Stepup1234@cluster0.8qewhkr.mongodb.net/studyAbroad?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000 // ৫ সেকেন্ডের মধ্যে কানেক্ট না হলে এরর দেবে
})
.then(() => console.log('✅ Connected to MongoDB Atlas Successfully!'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ইউনিভার্সিটি মডেল
const University = mongoose.model('University', new mongoose.Schema({
    name: String,
    location: String,
    country: String,
    course: String,
    degree: String,
    intake: String,
    minGPA: Number,
    languageType: String,
    minLanguageScore: Number,
    commissionAmount: Number
}, { strict: false }));

// ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: "Database Error: " + err.message });
    }
});

const PORT = process.env.PORT || 10000; // রেন্ডারের জন্য ডিফল্ট ১০০০০
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));