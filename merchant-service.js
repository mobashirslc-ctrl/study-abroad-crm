const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ১. মার্চেন্ট মডেল (মার্চেন্টদের তথ্য রাখার জন্য নতুন কালেকশন)
const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    phone: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' }));

// ২. আপনার রানিং অ্যাপ্লিকেশান মডেলটি ব্যবহার করা
const Application = mongoose.models.Application;

// ৩. কিউআর স্ক্যান লিড সাবমিশন এপিআই
router.post('/submit-scan-lead', async (req, res) => {
    try {
        const { name, phone, passport, gpa, refSource } = req.body;

        // আপনার রানিং ডাটাবেজে স্টুডেন্ট সেভ করা (যাতে লাইভ ট্র্যাকিং হয়)
        const newStudent = new Application({
            studentName: name,
            contactNo: phone, // আপনার এক্সিস্টিং স্কিমা অনুযায়ী
            passportNo: passport || "N/A", 
            status: 'PENDING', // আপনার রানিং সিস্টেমের ডিফল্ট স্ট্যাটাস
            handledBy: 'QR-Merchant',
            complianceNote: `Referred by Merchant: ${refSource}`,
            timestamp: new Date()
        });

        await newStudent.save();

        // মার্চেন্টের লিড কাউন্ট ১ বাড়িয়ে দেওয়া
        if (refSource && refSource !== 'Direct') {
            await Merchant.findOneAndUpdate(
                { merchantId: refSource },
                { $inc: { leadsCount: 1 } }
            );
        }

        res.json({ success: true, msg: "Submitted to live tracking!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৪. মার্চেন্টের স্ট্যাটাস দেখার এপিআই
router.get('/stats/:id', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.id });
        if(!stats) return res.status(404).json({msg: "Merchant not found"});
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
