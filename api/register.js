import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);
    try {
        await client.connect();
        const database = client.db('crm_db');
        const users = database.collection('users');

        const { fullName, email, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            fullName,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'partner',
            timestamp: new Date()
        };

        await users.insertOne(newUser);
        res.status(201).json({ msg: 'Success' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await client.close();
    }
}
