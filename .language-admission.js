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
    { name: 'studentPhoto', maxCount: 1 }, // ফর্মের নামের সাথে মিল রাখা হলো
    { name: 'nidFile', maxCount: 1 }      // ফর্মের নামের সাথে মিল রাখা হলো
]), async (req, res) => {
    try {
        const { 
            name, phone, guardianPhone, occupation, 
            district, thana, course, fee, batch, refSource 
        } = req.body;

        // ১. ওই কোর্সের ডায়নামিক কমিশন খুঁজে বের করা
        const courseData = await Course.findOne({ name: course });
        const commission = courseData ? courseData.agentCommission : 500; // ডাটাবেসে না থাকলে ডিফল্ট ৫০০

        // ২. নতুন স্টুডেন্ট এনরোলমেন্ট সেভ (Application মডেলে)
        const newStudent = new Application({
            studentName: name,
            contactNo: phone,
            guardianContact: guardianPhone,
            occupation: occupation,
            district: district,
            thana: thana,
            university: course, // কোর্সটি ইউনিভার্সিটি ফিল্ডে সেভ হচ্ছে আপনার আগের লজিক অনুযায়ী
            pendingAmount: Number(fee) || 0, 
            batchTime: batch,
            referredBy: refSource, // কিউআর থেকে আসা পার্টনার আইডি/ইমেইল
            
            // ৩. ফাইলের পাথ সেভ (সঠিক ফিল্ড নেম ব্যবহার করে)
            photoUrl: req.files['studentPhoto'] ? req.files['studentPhoto'][0].path : null,
            nidUrl: req.files['nidFile'] ? req.files['nidFile'][0].path : null,
            
            status: 'ENROLLED',
            timestamp: new Date()
        });
        
        await newStudent.save();

        // ৪. মার্চেন্ট বা পার্টনারের ওয়ালেট আপডেট
        if (refSource && refSource !== 'Direct') {
            await Merchant.findOneAndUpdate(
                { merchantId: refSource.toLowerCase().trim() }, // ইমেইল বা আইডি ফরম্যাট ফিক্সড
                { 
                    $inc: { 
                        leadsCount: 1, 
                        walletBalance: Number(commission) 
                    } 
                },
                { upsert: true, new: true } 
            );
        }

        res.status(201).json({ success: true, message: "Admission complete!" });

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
