const express = require('express');
const path = require('path');
const app = express();

// স্ট্যাটিক ফাইল ফোল্ডার সেট করা
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- এই অংশটি লিঙ্ক ফিক্স করবে ---

// ১. পার্টনার লিঙ্ক (yourdomain.com/partner)
app.get('/partner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'partner.html'));
});

// ২. অ্যাডমিন লিঙ্ক (yourdomain.com/admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ৩. হোম পেজ (অপশনাল)
app.get('/', (req, res) => {
    res.send('IHP CRM Server is Running...');
});

// বাকি সব API এবং ডাটাবেস কানেকশন নিচে থাকবে...
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));