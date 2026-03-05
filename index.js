const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// ১. আপনার MongoDB URI (পাসওয়ার্ডে @ থাকলে %40 লিখুন)
const mongoURI = "আপনার_মঙ্গোডিবি_কানেকশন_লিঙ্ক"; 

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 15000, // কানেকশন টাইমআউট বাড়ানো হয়েছে
    connectTimeoutMS: 15000
})
.then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ২. ডাটাবেস স্কিমা (আপনার ইনপুট ফিল্ডের সাথে মিলিয়ে)
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
}, { strict: false })); // অতিরিক্ত ফিল্ড থাকলেও যাতে এরর না দেয়

// ৩. ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: "Invalid Data Structure or Database Error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));