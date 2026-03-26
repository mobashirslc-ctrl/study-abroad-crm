import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    // Fallback logic: check both possible variable names
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!uri) {
        return res.status(500).json({ error: "No Database Connection String found in Vercel!" });
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        // ভিডিও অনুযায়ী ডেটাবেস নাম
        const database = client.db('StudyAbroadCRM'); 
        const users = database.collection('users');

        const { email, password } = req.body;
        
        // কেস-সেনসিটিভ ইস্যু এড়াতে trim এবং lowercase করা হয়েছে
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ msg: 'User not found in StudyAbroadCRM' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Invalid Password' });
        }

        return res.json({ 
            user: { email: user.email, name: user.fullName, role: user.role, logoURL: user.logoURL || "" } 
        });

    } catch (e) {
        return res.status(500).json({ error: "Server Error: " + e.message });
    } finally {
        await client.close();
    }
}
