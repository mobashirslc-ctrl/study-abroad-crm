const mongoose = require('mongoose');

const UniversitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    location: { type: String, required: true },
    intake: { type: String, required: true },
    course: { type: String, required: true },
    degree: { type: String, enum: ['UG', 'PG', 'Diploma', 'PHD', 'Research'], required: true },
    minGPA: { type: Number, required: true },
    languageType: { type: String, enum: ['IELTS', 'PTE', 'DUOLINGO'], required: true },
    minLanguageScore: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('University', UniversitySchema);