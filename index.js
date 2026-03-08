const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
// স্ট্যাটিক ফাইল লোড করার জন্য এটি নিশ্চিত করুন
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Master Database Connected'));

// University Schema (আপনার রিকোয়ারমেন্ট অনুযায়ী সব ফিল্ড)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, intake: String,
    degree: String, language: String, minScore: String, academicScore: String,
    fee: String, currency: String, bankBalance: String, bankName: String, 
    loanAmount: String, maritalStatus: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// --- Routes ---
// সরাসরি রুট ফাইলে কল করলে যাতে এরর না আসে
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/', (req, res) => res.redirect('/partner'));

// --- APIs ---
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const query = {};
    if(country) query.country = new RegExp(`^${country}$`, 'i');
    if(degree) query.degree = degree;
    if(language) query.language = language;

    const results = await University.find(query);
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));