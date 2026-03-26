import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
    // CORS & Security Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM'); 
        const type = req.query.type || 'applications';

        if (req.method === 'GET') {
            let data;
            if (type === 'universities') {
                data = await database.collection('universities').find({}).sort({ timestamp: -1 }).toArray();
            } else {
                data = await database.collection('applications').find({}).sort({ timestamp: -1 }).toArray();
            }
            return res.status(200).json(data);
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
}
