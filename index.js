const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// ১. আপনার MongoDB URI (পাসওয়ার্ডে @ থাকলে সেটি %40 লিখুন)
const mongoURI = "আপনার_কানেকশন_স্ট্রিং"; 

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000 // ৫ সেকেন্ড টাইমআউট যাতে 'buffering timed out' না হয়
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ Connection Error:', err));

// ২. ইউনিভার্সিটি স্কিমা (ফ্রন্টএন্ডের সব ফিল্ডের সাথে মিল রাখা হয়েছে)
const universitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    country: { type: String, required: true },
    course: { type: String, required: true },
    degree: { type: String, required: true },
    intake: { type: String, required: true },
    minGPA: { type: Number, required: true },
    languageType: { type: String, required: true },
    minLanguageScore: { type: Number, required: true },
    commissionAmount: { type: Number, required: true }
});

const University = mongoose.model('University', universitySchema);

// ৩. ইউনিভার্সিটি অ্যাড করার API
app.post('/api/universities', async (req, res) => {
    try {
        const university = new University(req.body);
        await university.save();
        res.status(201).json({ success: true, message: "University added!" });
    } catch (err) {
        console.error("Save Error:", err.message);
        res.status(400).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));