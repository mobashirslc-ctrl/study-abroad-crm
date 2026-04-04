const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// মডেলগুলো কানেক্ট করা (Overwrite Error এড়াতে এই পদ্ধতি শ্রেষ্ঠ)
const Application = mongoose.models.Application || mongoose.model('Application');
const User = mongoose.models.User || mongoose.model('User');
const Course = mongoose.models.Course || mongoose.model('Course');

// মার্চেন্ট ডাটাবেস স্কিমা
const MerchantSchema = new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    shopName: String,
    ownerName: String,
    leadsCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'merchants' });

const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);

// --- 🚀 APIs ---

// ১. স্টুডেন্ট ভর্তি এবং এজেন্টের ওয়ালেট আপডেট
router.post('/submit-scan-lead', async (req, res) => {
    try {
        const { name, phone, course, fee, batch, refSource } = req.body;

        // ওই কোর্সের ডায়নামিক কমিশন খুঁজে বের করা
        const courseData = await Course.findOne({ name: course });
        const commission = courseData ? courseData.agentCommission : 0;

        // নতুন স্টুডেন্ট এনরোলমেন্ট সেভ
        const newStudent = new Application({
            studentName: name,
            contactNo: phone,
            university: course, // কোর্সের নাম এখানে সেভ হবে
            pendingAmount: fee, // ভর্তি ফি
            batchTime: batch,   // নতুন ফিল্ড (যদি স্কিমাতে থাকে)
            referredBy: refSource,
            status: 'ENROLLED',
            timestamp: new Date()
        });
        await newStudent.save();

        // যদি কোনো মার্চেন্টের মাধ্যমে আসে, তবে তার প্রোফাইল আপডেট করা
        if (refSource && refSource !== 'Direct') {
            await Merchant.findOneAndUpdate(
                { merchantId: refSource },
                { 
                    $inc: { 
                        leadsCount: 1, 
                        walletBalance: Number(commission) // অটোমেটিক টাকা যোগ হবে
                    } 
                },
                { upsert: true } // মার্চেন্ট না থাকলে তৈরি করবে
            );
        }

        res.status(201).json({ success: true, message: "Enrollment complete!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ২. মার্চেন্ট ড্যাশবোর্ড স্ট্যাটাস দেখা
router.get('/stats/:mId', async (req, res) => {
    try {
        const stats = await Merchant.findOne({ merchantId: req.params.mId });
        if (!stats) return res.json({ leadsCount: 0, walletBalance: 0 });
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৩. মার্চেন্টের নিজস্ব স্টুডেন্ট লিস্ট দেখা
router.get('/leads/:mId', async (req, res) => {
    try {
        const leads = await Application.find({ referredBy: req.params.mId }).sort({ timestamp: -1 });
        res.json(leads);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
