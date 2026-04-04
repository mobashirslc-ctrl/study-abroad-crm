const axios = require('axios');

module.exports = async (req, res) => {
    // শুধুমাত্র POST রিকোয়েস্ট এলাউ করা
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    const { studentPhone, studentName, courseName } = req.body;

    try {
        // Diana SMS API Call
        const smsResponse = await axios.get(`https://login.dianasms.com/api/v3/send-sms`, {
            params: {
                api_token: '309|xccOQwAZJNXgEJKDhP5ZYtBkl9pBwFjNuPPNLJXq',
                sid: 'SLC_HUB', // আপনার অনুমোদিত Sender ID
                sms: `Congratulations ${studentName}! Your admission for ${courseName} at SLC Language Hub is confirmed. Welcome to our batch!`,
                msisdn: studentPhone
            }
        });

        // এখানে আপনার ডাটাবেসে status 'Approved' আপডেট করার লজিক হবে

        return res.status(200).json({ 
            success: true, 
            message: "Student Approved & SMS Sent Successfully!" 
        });

    } catch (error) {
        console.error("SMS Error:", error.message);
        return res.status(500).json({ success: false, message: "SMS failed to send." });
    }
};