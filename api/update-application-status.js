import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const client = new MongoClient(process.env.MONGODB_URI || process.env.MONGO_URI);

    try {
        await client.connect();
        const database = client.db('crm_db');
        const applications = database.collection('applications');
        
        const { appId, status, note, staff, action } = req.body;
        if (!appId) return res.status(400).json({ message: 'App ID missing' });

        let updateData = { updatedAt: new Date() };

        if (action === 'lock') {
            updateData.status = 'UNDER_REVIEW';
            updateData.complianceMember = staff;
        } else {
            updateData.status = status;
            updateData.complianceNote = note || "";
            updateData.complianceMember = staff;
            
            const app = await applications.findOne({ _id: new ObjectId(appId) });
            if (status === 'VERIFIED' && app) {
                updateData.pendingAmount = app.commissionBDT || 0;
            } else {
                updateData.pendingAmount = 0;
            }
        }

        await applications.updateOne(
            { _id: new ObjectId(appId) },
            { $set: updateData }
        );

        return res.status(200).json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        await client.close();
    }
}
