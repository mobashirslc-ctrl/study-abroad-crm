const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
// Static files middleware - নিশ্চিত করুন আপনার HTML ফাইলগুলো 'public' ফোল্ডারে আছে
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Master Database Connected'));

// --- SCHEMAS ---
const UniSchema = new mongoose.Schema({
    country: String, uniName: String, course: String, intake: String,
    degree: String, language: String, academicScore: String, langScore: String,
    fee: String, currency: String, bankBalance: String, bankType: String,
    maritalStatus: String, bankNameSuggestion: String, loanAmount: String, partnerCommission: String
});
const University = mongoose.model('University', UniSchema);

const PartnerSchema = new mongoose.Schema({
    name: String, status: { type: String, default: 'Pending' },
    wallet: { total: Number, pending: Number },
    expireDate: { type: Date, default: new Date('2026-12-31') }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// --- ROUTES (যাতে 404 Error না আসে) ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));

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