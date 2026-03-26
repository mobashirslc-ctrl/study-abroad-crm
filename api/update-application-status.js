 { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        await client.connect();
        
        // --- এই লাইনটি এখানে বসবে ---
        const database = client.db('StudyAbroadCRM'); 
        // ---------------------------

        const applications = database.collection('applications');
        const { appId, status, note, staff } = req.body;

        if (!appId) return res.status(400).json({ message: 'Application ID is required' });

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

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'No application found in StudyAbroadCRM database' });
        }

        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    } finally {
        await client.close();
    }
}
