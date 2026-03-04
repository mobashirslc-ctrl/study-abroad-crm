require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection with improved error handling
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // ৫ সেকেন্ডের মধ্যে কানেক্ট না হলে এরর দিবে
})
.then(() => console.log("✅ OK: MongoDB Connected Successfully to Atlas"))
.catch(err => {
    console.error("❌ MongoDB Connection Error: ", err.message);
    console.log("Tip: Check if 0.0.0.0/0 is active in MongoDB Atlas Network Access.");
});

// University Schema
const universitySchema = new mongoose.Schema({
    name: String,
    country: String,
    minGPA: Number,
    minIELTS: Number,
    maxGap: Number,
    minBankBalance: Number
});

const University = mongoose.model('University', universitySchema);

// Routes
app.post('/add-university', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).send({ message: "University added successfully!" });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/assess-student', async (req, res) => {
    try {
        const { gpa, ielts, gap, bankBalance } = req.body;
        const eligibleUniversities = await University.find({
            minGPA: { $lte: gpa },
            minIELTS: { $lte: ielts },
            maxGap: { $gte: gap },
            minBankBalance: { $lte: bankBalance }
        });
        res.send(eligibleUniversities);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});