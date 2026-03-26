import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);
    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM');
        const withdrawals = database.collection('withdrawals');

        if (req.method === 'POST') {
            const wd = { ...req.body, status: 'PENDING', timestamp: new Date() };
            await withdrawals.insertOne(wd);
            return res.status(201).json({ msg: 'Withdrawal Requested' });
        } 
        
        if (req.method === 'GET') {
            const data = await withdrawals.find({}).sort({ timestamp: -1 }).toArray();
            return res.status(200).json(data);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await client.close();
    }
}
