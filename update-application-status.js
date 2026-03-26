import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM'); 
        const applications = database.collection('applications');
        
        const { appId, status, note, staff } = req.body;

        if (!appId) {
            return res.status(400).json({ message: 'App ID missing' });
        }

        const result = await applications.updateOne(
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

        return res.status(200).json({ success: true, message: 'Saved successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.close();
    }
}
