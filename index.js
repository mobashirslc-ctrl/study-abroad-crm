const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
// এই লাইনটি সব HTML ফাইলকে সার্ভারের সাথে কানেক্ট করবে
app.use(express.static(path.join(__dirname, 'public')));

// --- ৪টি ড্যাশবোর্ড লিঙ্ক (Fixed Routing) ---

app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/compliance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'compliance.html'));
});

app.get('/team', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'team.html'));
});

// হোম পেজ চেক
app.get('/', (req, res) => {
    res.send("<h1>IHP CRM Server is Running Successfully!</h1><p>Visit /admin or /partner</p>");
});

// MongoDB Connection (আপনার দেওয়া URI)
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server is live on port ${PORT}`));