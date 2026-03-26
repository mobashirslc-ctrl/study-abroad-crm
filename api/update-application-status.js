import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req, res) {
    // CORS এবং মেথড চেক
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM'); 
        const applications = database.collection('applications');
        
        const { appId, status, note, staff } = req.body;

        if (!appId) return res.status(400).json({ message: 'Missing App ID' });

        await applications.updateOne(
            { _id: new ObjectId(appId) },
            { 
                $set: { 
                    status: status,
                    complianceNote: note,
                    verifiedBy: staff,
                    updatedAt: new Date()
                } 
            }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.close();
    }
}
