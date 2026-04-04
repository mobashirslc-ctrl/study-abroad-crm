const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// ১. ফাইল আপলোড কনফিগারেশন (Multer)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // নিশ্চিত করুন আপনার প্রজেক্টে 'uploads' নামে একটি ফোল্ডার আছে
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ২. মডেলগুলো কানেক্ট করা (Overwrite Error এড়াতে এই পদ্ধতি শ্রেষ্ঠ)
const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({}, { strict: false }));
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Course = mongoose.models.Course || mongoose.model('Course', new mongoose.Schema({}, { strict: false }));

// ৩. মার্চেন্ট ডাটাবেস স্কিমা
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

// ১. স্টুডেন্ট ভর্তি এবং এজেন্টের ওয়ালেট আপডেট (UPDATED with File & Address)
router.post('/submit-scan-lead', upload.fields([
    { name: 'photo', maxCount: 1 }, 
    { name: 'nid', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            name, phone, guardianPhone, occupation, occName, 
            district, thana, address, course, fee, batch, refSource 
        } = req.body;

        // ওই কোর্সের ডায়নামিক কমিশন খুঁজে বের করা
        const courseData = await Course.findOne({ name: course });
        const commission = courseData ? courseData.agentCommission : 0;

        // নতুন স্টুডেন্ট এনরোলমেন্ট সেভ
        const newStudent = new Application({
            studentName: name,
            contactNo: phone,
            guardianContact: guardianPhone,
            occupation: occupation,
            instituteName: occName,
            district: district,
            thana: thana,
            fullAddress: address,
            university: course, // কোর্সের নাম এখানে সেভ হবে
            pendingAmount: Number(fee), 
            batchTime: batch,
            referredBy: refSource,
            // ফাইলের পাথ সেভ করা হচ্ছে
            photoUrl: req.files['photo'] ? req.files['photo'][0].path : null,
            nidUrl: req.files['nid'] ? req.files['nid'][0].path : null,
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
                        walletBalance: Number(commission) 
                    } 
                },
                { upsert: true } 
            );
        }

        res.status(201).json({ success: true, message: "Enrollment complete!" });
    } catch (err) {
        console.error("Error in submission:", err);
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
