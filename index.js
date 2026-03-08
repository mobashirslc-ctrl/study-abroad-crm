const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
// পাবলিক ফোল্ডারটি স্ট্যাটিক হিসেবে সেট করা
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://IHPCRM:CRM2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI).then(() => console.log('✅ Connected to MongoDB'));

// --- SCHEMAS ---
const FileSchema = new mongoose.Schema({
    studentName: String,
    contact: String,
    university: String,
    status: { type: String, default: 'Pending' },
    pdfUrl: { type: String, default: '#' },
    complianceInfo: { 
        name: { type: String, default: 'IHP Member' },
        org: { type: String, default: 'IHP Global' },
        id: { type: String, default: 'IHP-001' }
    },
    openTime: { type: Date, default: Date.now }
});
const FileTrack = mongoose.model('FileTrack', FileSchema);

// --- APIs ---

// ফাইল ওপেন এবং সাবমিট (পিডিএফ সহ)
app.post('/api/open-file', async (req, res) => {
    try {
        const newFile = new FileTrack(req.body);
        await newFile.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ট্র্যাকিং লিস্টের জন্য ডাটা রিড
app.get('/api/admin/files', async (req, res) => {
    try {
        const files = await FileTrack.find().sort({ openTime: -1 });
        res.json(files);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROUTES (404 Error ফিক্স করার জন্য) ---
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));