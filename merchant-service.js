const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ১. মার্চেন্ট মডেল (মার্চেন্ট স্পেসিফিক ডাটার জন্য)
const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    phone: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' }));

// ২. প্রয়োজনীয় মডেলগুলো রেফারেন্স করা
const Application = mongoose.models.Application;
const User = mongoose.models.User;

/** * ৩. অ্যাডমিন কর্তৃক মার্চেন্ট আইডি ও স্ট্যাটাস আপডেট করার রাউট 
 * এটি আপনার অ্যাডমিন প্যানেলের 'Approve & Save' বাটনের সাথে কাজ করবে।
 */
router.patch('/update-id/:id', async (req, res) => {
    try {
        const { merchantId, status } = req.body;
        const userId = req.params.id;

        // User কালেকশনে আইডি এবং স্ট্যাটাস আপডেট করা
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 
                merchantId: merchantId, 
                status: status || 'active' 
            }, 
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: "Merchant not found in Users" });
        }

        // ঐচ্ছিক: মার্চেন্ট যদি 'merchants' কালেকশনে না থাকে তবে নতুন এন্ট্রি তৈরি করা
        await Merchant.findOneAndUpdate(
            { merchantId: merchantId },
            { 
                shopName: updatedUser.orgName, 
                ownerName: updatedUser.fullName,
                phone: updatedUser.contact 
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Merchant ID and Status updated successfully!" });
    } catch (err) {
        console.error("Update ID Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৪. কিউআর স্ক্যান থেকে লিড সাবমিশন এপিআই
router.post('/submit-scan-lead', async (req, res) => {
    try {
        const { name, phone, passport, gpa, refSource } = req.body;

        const newStudent = new Application({
            studentName: name,
            contactNo: phone, 
            passportNo: passport || "N/A", 
            gpa: gpa,
            status: 'PENDING', 
            referredBy: refSource, 
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

// ৫. মার্চেন্টের আন্ডারে থাকা স্টুডেন্ট হিস্ট্রি এপিআই
router.get('/leads/:mId', async (req, res) => {
    try {
        const leads = await Application.find({ referredBy: req.params.mId }).sort({ timestamp: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ৬. মার্চেন্ট প্রোফাইল স্ট্যাটাস/ড্যাশবোর্ড ডাটা
router.get('/stats/:id', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.id });
        res.json(stats || { leadsCount: 0, walletBalance: 0 });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

module.exports = router;
