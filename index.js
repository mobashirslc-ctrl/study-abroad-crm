const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ 100% Sync Database Connected'));

// 1. University Schema (All your requested fields)
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, location: String, course: String, intake: String,
    degree: String, language: String, minScore: String, academicScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankName: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

// 2. Routes
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(publicPath, 'partner.html')));
app.get('/student', (req, res) => res.sendFile(path.join(publicPath, 'student.html')));
app.get('/', (req, res) => res.redirect('/partner'));

// 3. APIs
app.post('/api/add-uni', async (req, res) => {
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.json({ success: true });
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/search-uni', async (req, res) => {
    const { country, degree, language } = req.query;
    const results = await University.find({ 
        country: new RegExp(`^${country}$`, 'i'), 
        degree: new RegExp(`^${degree}$`, 'i'), 
        language: new RegExp(`^${language}$`, 'i') 
    });
    res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));