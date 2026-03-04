const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
name: { type: String, required: true },
email: { type: String, required: true, unique: true },
phone: { type: String, required: true },
course: { type: String, required: true },
country: { type: String, required: true },
createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Student', StudentSchema);