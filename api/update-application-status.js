import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const uri = process.env.MONGODB_URI;
    if (!uri) return res.status(500).json({ message: 'MONGODB_URI is not defined in Vercel settings' });

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM'); 
        const applications = database.collection('applications');
        
        const { appId, status, note, staff } = req.body;

        if (!appId || !ObjectId.isValid(appId)) {
            return res.status(400).json({ message: 'Invalid or missing Application ID' });
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

        res.status(200).json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.close();
    }
}
