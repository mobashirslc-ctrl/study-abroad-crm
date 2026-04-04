const cloudinary = require('cloudinary').v2;
const formidable = require('formidable');

const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

// MongoDB কানেকশন চেক
if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log("MongoDB Connected"))
        .catch(err => console.error("MongoDB Connection Error:", err));
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Vercel Serverless Config
export const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: "Only POST allowed" });

    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ success: false, message: "Error parsing form" });

        try {
            let photoUrl = null;
            let nidUrl = null;

            // ১. ফটো আপলোড
            if (files.studentPhoto) {
                const resPhoto = await cloudinary.uploader.upload(files.studentPhoto.filepath, {
                    folder: 'slc_language_hub/photos'
                });
                photoUrl = resPhoto.secure_url;
            }

            // ২. NID আপলোড
            if (files.nidFile) {
                const resNid = await cloudinary.uploader.upload(files.nidFile.filepath, {
                    folder: 'slc_language_hub/documents'
                });
                nidUrl = resNid.secure_url;
            }

            // ৩. ডাটাবেসের জন্য অবজেক্ট তৈরি
            const admissionData = {
                name: fields.name,
                phone: fields.phone,
                guardianPhone: fields.guardianPhone,
                occupation: fields.occupation,
                district: fields.district,
                thana: fields.thana,
                course: fields.course,
                batch: fields.batch,
                fee: fields.fee,
                refSource: fields.refSource,
                photoUrl: photoUrl,
                nidUrl: nidUrl,
                submittedAt: new Date()
            };

            console.log("Success! Data received:", admissionData);

            // সফল রেসপন্স
            return res.status(200).json({ 
                success: true, 
                message: "Admission Success! Files are safe in Cloudinary.",
                id: "SLC-" + Math.floor(1000 + Math.random() * 9000),
                photo: photoUrl
            });

        } catch (error) {
            console.error("Upload Error:", error);
            return res.status(500).json({ success: false, message: "Cloudinary Error: " + error.message });
        }
    });
};
