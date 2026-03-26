import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await client.connect();
        const database = client.db('StudyAbroadCRM'); 
        const applications = database.collection('applications');
        
        // এখানে id এবং appId দুইটাই চেক করা হচ্ছে যাতে ভুল না হয়
        const { id, appId, status, note, staff } = req.body;
        const targetId = appId || id;

        if (!targetId) {
            return res.status(400).json({ message: 'Application ID (appId) is missing in request' });
        }

        const result = await applications.updateOne(
            { _id: new ObjectId(targetId) },
            { 
                $set: { 
                    status: status,
                    complianceNote: note,
                    verifiedBy: staff,
                    updatedAt: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'No application found with this ID' });
        }

        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    } finally {
        await client.close();
    }
}
