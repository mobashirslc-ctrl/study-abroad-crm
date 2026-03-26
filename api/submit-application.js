import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);
    try {
        await client.connect();
        const database = client.db('crm_db');
        const applications = database.collection('applications');

        const newApp = {
            ...req.body,
            status: 'PENDING',
            pendingAmount: 0,
            finalAmount: 0,
            timestamp: new Date()
        };

        await applications.insertOne(newApp);
        res.status(201).json({ msg: 'Submitted Successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await client.close();
    }
}
