const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// আপনার root ডিরেক্টরিতে থাকা ফাইল সরাসরি কল করুন
const Application = require('./Application'); 
// যদি User মডেলটিও root-এ থাকে তবে এটিও নিচের মতো হবে
const User = require('./index'); // অথবা যেখানে User মডেল ডিফাইন করা আছে


// ১. মার্চেন্ট মডেল
const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    phone: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' }));

// ২. মডেল রেফারেন্স (নিশ্চিত করুন এগুলো আপনার main index.js এ ডিফাইন করা আছে)
const Application = mongoose.models.Application;
const User = mongoose.models.User;

// ৩. মার্চেন্ট আইডি ও স্ট্যাটাস আপডেট রাউট (Admin Panel এর জন্য)
router.patch('/update-id/:id', async (req, res) => {
    try {
        const { merchantId, status } = req.body;
        const userId = req.params.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { merchantId: merchantId, status: status || 'active' }, 
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: "Merchant not found" });
        }

        await Merchant.findOneAndUpdate(
            { merchantId: merchantId },
            { 
                shopName: updatedUser.orgName, 
                ownerName: updatedUser.fullName,
                phone: updatedUser.contact 
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Merchant Activated!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * ৪. কিউআর স্ক্যান থেকে লিড সাবমিশন এপিআই (সংশোধিত)
 * আপনার ফ্রন্টএন্ড ফর্মের সব ডাটা এখানে রিসিভ করা হচ্ছে
 */
router.post('/submit-scan-lead', async (req, res) => {
    try {
        // ফ্রন্টএন্ড থেকে আসা সব ইনপুট এখানে ধরছি
        const { name, phone, passport, degree, country, uni, lang, gpa, refSource } = req.body;

        const newStudent = new Application({
            studentName: name,
            contactNo: phone, 
            passportNo: passport || "N/A", 
            expectedDegree: degree,        // নতুন যোগ করা হয়েছে
            expectedCountry: country,      // নতুন যোগ করা হয়েছে
            preferredUni: uni || "N/A",    // নতুন যোগ করা হয়েছে
            languageScore: lang,           // নতুন যোগ করা হয়েছে
            gpa: gpa,
            status: 'PENDING', 
            referredBy: refSource, 
            handledBy: 'QR-Merchant',
            timestamp: new Date()
        });

        await newStudent.save();

        // মার্চেন্টের লিড কাউন্ট ১ বৃদ্ধি করা
        if (refSource && refSource !== 'Direct') {
            await Merchant.findOneAndUpdate(
                { merchantId: refSource },
                { $inc: { leadsCount: 1 } }
            );
        }

        res.json({ success: true, message: "Assessment submitted successfully!" });
    } catch (err) {
        console.error("Lead Submission Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৫. মার্চেন্টের লিড হিস্ট্রি
router.get('/leads/:mId', async (req, res) => {
    try {
        const leads = await Application.find({ referredBy: req.params.mId }).sort({ timestamp: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ৬. ড্যাশবোর্ড স্ট্যাটাস
router.get('/stats/:id', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.id });
        res.json(stats || { leadsCount: 0, walletBalance: 0 });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

module.exports = router;
