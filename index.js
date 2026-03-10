const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const mongoURI = process.env.MONGODB_URI; 
mongoose.connect(mongoURI).then(() => console.log("✅ DB Locked")).catch(err => console.log(err));

const University = mongoose.model('University', new mongoose.Schema({
    uniName: String, country: String, courseName: String, degreeType: String, 
    intake: String, location: String, semesterFee: String, totalFee: String,
    partnerCommission: String, bankNameBD: String, loanAmount: String, 
    maritalStatus: String, ieltsScore: String
}));

const Partner = mongoose.model('Partner', new mongoose.Schema({
    name: String, email: { type: String, unique: true }, pass: String,
    status: { type: String, default: 'Pending' }, walletBalance: { type: Number, default: 0 }
}));

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'partner.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/api/partner/register', async (req, res) => {
    try { const n = new Partner(req.body); await n.save(); res.json({msg: "Success"}); } 
    catch (e) { res.status(400).json({msg: "Error"}); }
});

app.post('/api/partner/login', async (req, res) => {
    const p = await Partner.findOne({ email: req.body.email, pass: req.body.pass });
    if (!p) return res.status(401).json({ msg: "Invalid" });
    if (p.status !== 'Active') return res.status(401).json({ msg: "Pending" });
    res.json({ id: p._id, name: p.name });
});

app.get('/api/universities', async (req, res) => res.json(await University.find()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Running on ${PORT}`));