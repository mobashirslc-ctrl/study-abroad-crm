const axios = require('axios');
const mongoose = require('mongoose');

// MongoDB কানেকশন ফাংশন
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
};

module.exports = async (req, res) => {
    // CORS Headers (অন্য ডোমেইন থেকে রিকোয়েস্ট এলাউ করার জন্য)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    // ১. অ্যাডমিন প্যানেল থেকে পাঠানো ডেটা রিসিভ করা
    const { id, studentPhone, studentName, courseName } = req.body;

    try {
        await connectDB();

        // ২. ডাটাবেসে স্ট্যাটাস আপডেট করা (ID অনুযায়ী)
        const updatedStudent = await mongoose.connection.collection('admissions').updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $set: { status: 'approved', paymentStatus: 'paid' } }
        );

        if (updatedStudent.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Student record not found in database." });
        }

        // ৩. Diana SMS API Call
        const smsResponse = await axios.get(`https://login.dianasms.com/api/v3/send-sms`, {
            params: {
                api_token: '309|xccOQwAZJNXgEJKDhP5ZYtBkl9pBwFjNuPPNLJXq',
                sid: 'SLC_HUB',
                sms: `Congratulations ${studentName}! Your admission for ${courseName} at SLC Language Hub is confirmed. Welcome to our batch!`,
                msisdn: studentPhone
            }
        });

        return res.status(200).json({ 
            success: true, 
            message: "Student Approved in Database & SMS Sent Successfully!",
            smsStatus: smsResponse.data 
        });

    } catch (error) {
        console.error("Approval Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Process failed. Check database or SMS API.",
            error: error.message 
        });
    }
};
