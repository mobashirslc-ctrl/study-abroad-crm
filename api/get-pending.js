const mongoose = require('mongoose');
// আপনার Admission Schema টি এখানে ইমপোর্ট করুন
const Admission = require('../models/Admission'); // পাথটি আপনার ফোল্ডার অনুযায়ী চেক করে নিন

module.exports = async (req, res) => {
    try {
        // শুধু যাদের স্ট্যাটাস 'pending' তাদের খুঁজে বের করা
        const pendingList = await Admission.find({ status: 'pending' }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: pendingList
        });
    } catch (err) {
        console.error("Error fetching pending admissions:", err);
        res.status(500).json({
            success: false,
            message: "Server Error! ডাটা পাওয়া যায়নি।"
        });
    }
};
