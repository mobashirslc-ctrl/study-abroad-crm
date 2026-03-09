const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const DB_URI = process.env.MONGODB_URI || "mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority";
mongoose.connect(DB_URI).then(() => console.log("IHP CRM: Systems Connected")).catch(err => console.log(err));

// --- Schemas ---
const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, 
    status: { type: String, default: 'Inactive' }, 
    walletBalance: { type: Number, default: 0 }
}));

const University = mongoose.model('University', new mongoose.Schema({
    country: String, uniName: String, courseName: String, intake: String, degree: String, 
    partnerCommission: { type: Number, default: 0 }, location: String
}));

// --- Routes (এগুলো না থাকলে ৪-০-৪ এরর আসবে) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

// --- APIs ---
app.post('/api/partner/login', async (req, res) => {
    try {
        const { email } = req.body;
        const partner = await Partner.findOne({ email });
        if (!partner) return res.status(404).json({ message: "User not found!" });
        if (partner.status !== 'Active') return res.status(403).json({ message: "Account Inactive." });
        res.json(partner);
    } catch (e) { res.status(500).json({ message: "Server Error" }); }
});

// Assessment Search API (FIXED Syntax Error on Line 46)
app.post('/api/partner/assessment', async (req, res) => {
    try {
        const { country, degree } = req.body;
        let query = {};
        // আপনার ভুলটি এখানে ছিল:
        if (country) query.country = new RegExp(country, 'i'); 
        if (degree) query.degree = degree;
        
        const results = await University.find(query);
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));