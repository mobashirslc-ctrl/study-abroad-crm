const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/** * ১. মডেলগুলো সরাসরি Mongoose থেকে কল করা হচ্ছে। 
 * যেহেতু index.js-এ এগুলো অলরেডি ডিফাইন করা আছে, 
 * তাই নতুন করে require বা model ডিক্লেয়ার করার দরকার নেই।
 */
const Application = mongoose.models.Application || mongoose.model('Application');
const User = mongoose.models.User || mongoose.model('User');

// ২. মার্চেন্ট মডেল (এটি আপনার নতুন কালেকশন, তাই সেফভাবে ডিফাইন করা হলো)
const MerchantSchema = new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    phone: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' });

const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);

/**
 * ৩. কিউআর স্ক্যান থেকে লিড সাবমিশন এপিআই
 */
router.post('/submit-scan-lead', async (req, res) => {
    try {
        const { name, phone, passport, degree, country, uni, lang, gpa, refSource } = req.body;

        // আপনার Application Schema-তে এই নতুন ফিল্ডগুলো না থাকলেও মঙ্গুস এরর দিবে না, 
        // তবে ডাটাবেজে শুধু সেগুলোই সেভ হবে যা Schema-তে আছে।
        const newStudent = new Application({
            studentName: name,
            contactNo: phone, 
            passportNo: passport || "N/A", 
            expectedDegree: degree,        
            expectedCountry: country,      
            preferredUni: uni || "N/A",    
            languageScore: lang,           
            gpa: gpa,
            status: 'PENDING', 
            referredBy: refSource, 
            handledBy: 'QR-Merchant',
            timestamp: new Date()
        });

        await newStudent.save();

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

/**
 * ৪. মার্চেন্ট আইডি ও স্ট্যাটাস আপডেট রাউট
 */
router.patch('/update-id/:id', async (req, res) => {
    try {
        const { merchantId, status } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { merchantId: merchantId, status: status || 'active' }, 
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ success: false, error: "Not found" });

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

// ৫. মার্চেন্ট লিড হিস্ট্রি
router.get('/leads/:mId', async (req, res) => {
    try {
        const leads = await Application.find({ referredBy: req.params.mId }).sort({ timestamp: -1 });
        res.json(leads);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ৬. ড্যাশবোর্ড স্ট্যাটাস
router.get('/stats/:id', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.id });
        res.json(stats || { leadsCount: 0, walletBalance: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
