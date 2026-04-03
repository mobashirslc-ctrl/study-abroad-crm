const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ১. মার্চেন্ট মডেল (নতুন কালেকশন)
const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    phone: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' }));

// ২. আপনার রানিং অ্যাপ্লিকেশান মডেল ব্যবহার করা
const Application = mongoose.models.Application;

// ৩. কিউআর স্ক্যান থেকে লিড সাবমিশন এপিআই
router.post('/submit-scan-lead', async (req, res) => {
    try {
        const { name, phone, passport, gpa, refSource } = req.body;

        const newStudent = new Application({
            studentName: name,
            contactNo: phone, 
            passportNo: passport || "N/A", 
            gpa: gpa,
            status: 'PENDING', 
            referredBy: refSource, // এই ফিল্ডটি মার্চেন্ট ট্র্যাকিং করবে
            handledBy: 'QR-Merchant',
            timestamp: new Date()
        });

        await newStudent.save();

        // মার্চেন্টের লিড কাউন্ট আপডেট
        if (refSource && refSource !== 'Direct') {
            await Merchant.findOneAndUpdate(
                { merchantId: refSource },
                { $inc: { leadsCount: 1 } }
            );
        }

        res.json({ success: true, msg: "Assessment submitted!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৪. মার্চেন্টের আন্ডারে থাকা স্টুডেন্ট হিস্ট্রি এপিআই
router.get('/leads/:mId', async (req, res) => {
    try {
        const leads = await Application.find({ referredBy: req.params.mId }).sort({ timestamp: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ৫. মার্চেন্ট প্রোফাইল স্ট্যাটাস
router.get('/stats/:id', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.id });
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
