import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // শুধুমাত্র PATCH রিকোয়েস্ট এলাউ করা হবে
    if (req.method !== 'PATCH') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await client.connect();
        const database = client.db('test'); // আপনার DB নাম চেক করে নিন
        const applications = database.collection('applications');

        const { appId, status, note, isVerified, staff } = req.body;

        if (!appId) {
            return res.status(400).json({ message: 'Application ID is required' });
        }

        const result = await applications.updateOne(
            { _id: new ObjectId(appId) },
            { 
                $set: { 
                    status: status,
                    complianceNote: note,
                    isVerified: isVerified,
                    verifiedBy: staff,
                    updatedAt: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        await client.close();
    }
}
