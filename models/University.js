const mongoose = require('mongoose');

const UniversitySchema = new mongoose.Schema({
    universityName: String,
    country: String,
    courseName: String,
    gpaRequirement: Number,
    ieltsRequirement: Number,
    maxStudyGap: Number,
    minBankBalance: Number,
    tuitionFees: String,
    intake: String
}, { timestamps: true });

module.exports = mongoose.model('University', UniversitySchema);