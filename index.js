const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors()); 
app.use(express.json());

const publicPath = path.join(__dirname, 'public'); 
app.use(express.static(publicPath));

// রুট পাথ
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth.html'));
});

app.get('/track', (req, res) => {
    res.sendFile(path.join(publicPath, 'track.html'));
});

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://GORUN:IhpCrm2026@cluster0.8qewhkr.mongodb.net/crm_db?retryWrites=true&w=majority';

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return; 
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully to MongoDB');
    } catch (err) {
        console.error('❌ DB Error:', err.message);
        throw err;
    }
};

// --- Models ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' },
    contact: String,
    orgName: String,
    authorisedPerson: String,
    address: String,
    nidPdf: String,
    tradeLicensePdf: String,
    expertCountries: String,
    experience: String,
    website: String,
    logoUrl: String,
    status: { type: String, default: 'pending' }, 
    expiryDate: { type: Date, default: null },   
    walletBalance: { type: Number, default: 0 }
}, { collection: 'users' }));

const Application = mongoose.models.Application || mongoose.model('Application', new mongoose.Schema({
    studentName: String, 
    passportNo: String, 
    partnerEmail: String, 
    university: String,
    commissionBDT: Number, 
    pdf1: String, pdf2: String, pdf3: String, pdf4: String,
    status: { type: String, default: 'PENDING' }, 
    complianceMember: String, 
    complianceNote: String, 
    pendingAmount: { type: Number, default: 0 },
    handledBy: String, 
    lockBy: { type: String, default: null }, 
    lockUntil: { type: Date, default: null }, 
    timestamp: { type: Date, default: Date.now }
}, { collection: 'applications' }));

const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({
    partnerEmail: { type: String, required: true },
    partnerName: String,
    amount: { type: Number, required: true },
    method: { type: String, default: 'Bank/Mobile Finance' },
    status: { type: String, default: 'PENDING' }, 
    timestamp: { type: Date, default: Date.now }
}, { collection: 'withdrawals' }));

const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: String,
    country: String,
    location: String,
    degree: String,
    duration: String,
    semesterFee: Number,
    livingCost: Number,
    jobOpportunity: String,
    partnerComm: Number,
    minGPA: Number,
    ieltsReq: Number,
    gap: Number
}, { collection: 'universities' }));

// --- API Routes ---

// Registration
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    try {
        await connectDB();
        const { role, fullName, email, password, contact, orgName, authorisedPerson, address, expertCountries, experience, website } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and Password are required!" });
        
        const cleanEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) return res.status(400).json({ message: "Email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            role: role || 'partner', fullName, email: cleanEmail, password: hashedPassword,
            contact, orgName, authorisedPerson, address, expertCountries, experience, website,
            status: 'pending', walletBalance: 0
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "Registration successful! Waiting for Admin Approval." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Admin: Wallet Update (FIXED SYNTAX)
app.patch('/api/applications/:id', async (req, res) => {
    await connectDB();
    try {
        const { pendingAmount, status } = req.body; 
        const amountFromAdmin = Number(pendingAmount) || 0; 

        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Application not found" });

        const updatedApp = await Application.findByIdAndUpdate(
            req.params.id, 
            { $inc: { pendingAmount: -amountFromAdmin }, status: status || 'PARTIAL_PAID' }, 
            { new: true }
        );

        if (amountFromAdmin > 0 && appData.partnerEmail) {
            const partnerEmailClean = appData.partnerEmail.toLowerCase().trim();
            await User.findOneAndUpdate(
                { email: partnerEmailClean }, 
                { $inc: { walletBalance: amountFromAdmin } }
            );
        }

        res.json({ 
            msg: `Success! ${amountFromAdmin} added to wallet.`, // FIXED BACKTICKS & VARIABLE
            data: updatedApp 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Withdrawal Request
app.post('/api/withdrawals', async (req, res) => {
    await connectDB();
    try {
        const { email, amount, partnerName, method } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || user.walletBalance < Number(amount)) {
            return res.status(400).json({ error: "Insufficient balance or user not found!" });
        }
        const newWithdraw = new Withdrawal({
            partnerEmail: email.toLowerCase().trim(), partnerName, amount: Number(amount), method, status: 'PENDING'
        });
        await newWithdraw.save();
        res.status(201).json({ msg: "Withdrawal request submitted!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Locking Application (FIXED SYNTAX)
app.patch('/api/lock-application/:id', async (req, res) => {
    await connectDB();
    try {
        const { staffEmail } = req.body;
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Application not found" });

        if (appData.lockBy && appData.lockBy !== staffEmail && appData.lockUntil > new Date()) {
            return res.status(403).json({ locked: true, message: `Locked by ${appData.lockBy}` }); // FIXED BACKTICKS
        }

        const lockTime = new Date(Date.now() + 5 * 60000); 
        await Application.findByIdAndUpdate(req.params.id, { lockBy: staffEmail, lockUntil: lockTime });
        res.json({ locked: false, message: "Lock acquired" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compliance Update (FIXED SYNTAX)
app.patch('/api/update-compliance', async (req, res) => {
    await connectDB(); 
    try {
        const { appId, status, complianceNote, staffEmail, commission } = req.body;
        let updateData = { 
            status, complianceNote, complianceMember: staffEmail,
            lockBy: null, lockUntil: null, timestamp: new Date()
        };

        if (['VERIFIED', 'DOCS_VERIFIED', 'DOC_VERIFIED'].includes(status)) {
            updateData.pendingAmount = Number(commission) || 0;
        } else {
            updateData.pendingAmount = 0;
        }

        const updatedApp = await Application.findByIdAndUpdate(appId, { $set: updateData }, { new: true });
        res.json({ msg: `Updated successfully to ${status}`, data: updatedApp }); // FIXED BACKTICKS
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// User List & Status (Admin)
app.get('/api/admin/users', async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/status', async (req, res) => {
    await connectDB();
    try {
        await User.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ msg: "Status Updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ msg: `Your account is ${user.status}!` });
        }
        res.json({ user: { 
            email: user.email, name: user.fullName, role: user.role, orgName: user.orgName, logoUrl: user.logoUrl, walletBalance: user.walletBalance || 0 
        }});
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// /api/admin/transfer-payment
app.post('/api/admin/transfer-payment', async (req, res) => {
    const { studentPassport, transferAmount, partnerEmail } = req.body;

    try {
        // ১. স্টুডেন্টের অ্যাপ্লিকেশন আপডেট (Pending Amount কমানো)
        // আমরা ধরি স্টুডেন্টের পাসপোর্ট ইউনিক আইডি হিসেবে কাজ করছে
        const application = await Application.findOne({ passportNo: studentPassport });
        
        if (!application) return res.status(404).send("Application not found");

        const currentPending = Number(application.pendingAmount || application.commissionBDT);
        
        if (transferAmount > currentPending) {
            return res.status(400).send("Transfer amount exceeds pending amount");
        }

        // নতুন পেন্ডিং অ্যামাউন্ট সেট করা
        application.pendingAmount = currentPending - Number(transferAmount);
        await application.save();

        // ২. পার্টনারের ওয়ালেট আপডেট (Available Balance বাড়ানো)
        const partner = await User.findOne({ email: partnerEmail.toLowerCase().trim() });
        
        if (partner) {
            partner.walletBalance = (Number(partner.walletBalance) || 0) + Number(transferAmount);
            await partner.save();
        }

        res.status(200).json({ 
            success: true, 
            message: "Payment transferred successfully",
            remainingPending: application.pendingAmount 
        });

    } catch (error) {
        res.status(500).send("Server Error");
    }
});
// Global Application Search
app.get('/api/applications', async (req, res) => {
    await connectDB();
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/universities', async (req, res) => {
    await connectDB();
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth.html'));
});

module.exports = app;
