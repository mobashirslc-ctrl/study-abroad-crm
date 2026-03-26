import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);

    try {
        await client.connect();
        // ভিডিও অনুযায়ী সঠিক ডাটাবেস নাম ব্যবহার করা হয়েছে
        const database = client.db('StudyAbroadCRM'); 
        const users = database.collection('users');

        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ msg: 'Email and Password required' });
        }

        // ইউজার খোঁজা
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        // পাসওয়ার্ড চেক
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // সফল লগইন
        return res.json({ 
            user: { 
                email: user.email, 
                name: user.fullName, 
                role: user.role, 
                logoURL: user.logoURL || "" 
            } 
        });

    } catch (e) {
        console.error("Login Error:", e);
        return res.status(500).json({ error: "Server error: " + e.message });
    } finally {
        await client.close();
    }
}
