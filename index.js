const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// ১. আপনার MongoDB URI এখানে দিন (পাসওয়ার্ডে @ থাকলে সেটি %40 লিখুন)
const mongoURI = "আপনার_কানেকশন_স্ট্রিং"; 

mongoose.connect(mongoURI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ Connection Error:', err));

// ২. ডাটাবেস স্কিমা (আপনার ইনপুট ফিল্ডের সাথে মিল রেখে)
const universitySchema = new mongoose.Schema({
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
});

const University = mongoose.model('University', universitySchema);

// ৩. ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        console.log("Received Data:", req.body); // ডিবাগিং এর জন্য
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: "Invalid Data Structure: " + err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));