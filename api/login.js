import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);
    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM');
        const users = database.collection('users');

        const { email, password } = req.body;
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        res.json({ user: { email: user.email, name: user.fullName, role: user.role, logoURL: user.logoURL } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await client.close();
    }
}
