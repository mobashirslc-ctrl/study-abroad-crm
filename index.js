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

// ১. পাথ ঠিক করা (যদি ফাইলগুলো সরাসরি মেইন ফোল্ডারে থাকে তবে 'public' বাদ দিন)
// যদি ফাইলগুলো public ফোল্ডারে থাকে তবে নিচেরটি ঠিক আছে:
const publicPath = path.join(__dirname, 'public'); 

// ২. স্ট্যাটিক ফাইল মিডলওয়্যার
app.use(express.static(publicPath));

// ৩. রুট পাথ এ সরাসরি index.html পাঠানো
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth.html')); // index এর জায়গায় auth লিখে দিন
});

// ৪. ট্র্যাকিং পেজের জন্য আলাদা পাথ (যদি সরাসরি /track.html কাজ না করে)
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

// --- 👤 Models ---
// --- 👤 Updated User Model ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'partner' }, // partner or staff
    contact: String,
    orgName: String,
    
    // --- New Fields for Registration ---
    authorisedPerson: String,
    address: String,
    nidPdf: String,           // PDF URL/Path
    tradeLicensePdf: String,  // PDF URL/Path
    expertCountries: String,  // For Staff
    experience: String,       // For Staff
    website: String,
    
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
    method: { type: String, default: 'Bank/Mobile Finance' }, // বিকাশ বা ব্যাংক ডিটেইলস
    status: { type: String, default: 'PENDING' }, // PENDING, COMPLETED, REJECTED
    timestamp: { type: Date, default: Date.now }
}, { collection: 'withdrawals' }));

// --- 🏫 Updated University Model with Smart Assessment Fields ---
const University = mongoose.models.University || mongoose.model('University', new mongoose.Schema({
    universityName: { type: String, required: true },
    country: { type: String, required: true },
    location: String,
    degreeType: String,      // Bachelor, Master, Foundation
    courseName: String,      // Matching Courses
    duration: String,
    
    // Financials
    totalTuitionFee: Number, // মোট টিউশন ফি
    initialDeposit: Number,  // অফার লেটার/CAS এর জন্য যা লাগবে (Fly Fee)
    scholarshipMax: Number,  // সর্বোচ্চ কত স্কলারশিপ সম্ভব
    othersFee: Number,       // Application/Admin Fee
    
    // Requirements (For Unlock Logic)
    minGPA: { type: Number, default: 0 },       // রিকোয়ারমেন্ট ১
    ieltsReq: { type: Number, default: 0 },     // রিকোয়ারমেন্ট ২
    maxGapAllowed: { type: Number, default: 0 }, // রিকোয়ারমেন্ট ৩ (In Years)
    
    // Strategy & Insights
    visaSuccessRate: { type: Number, default: 85 }, // ভিসা হওয়ার সম্ভাবনা (%)
    processingTime: String,  // উদা: "7-10 Working Days"
    intake: String,          // উদা: "Sept 2026"
    
    timestamp: { type: Date, default: Date.now }
}, { collection: 'universities' }));
 অ্যাসেসমেন্টের জন্য
// --- 🚀 API Routes ---
// --- 👑 Admin Master Routes ---
// --- 📝 New Registration Route (সংশোধিত ও ফিক্সড) ---
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    try {
        // ১. নিশ্চিত করা যে ডাটাবেস কানেক্টেড
        await connectDB();

        const { 
            role, fullName, email, password, contact, 
            orgName, authorisedPerson, address, 
            expertCountries, experience, website 
        } = req.body;

        // ২. ইমেইল ভ্যালিডেশন
        if (!email || !password) {
            return res.status(400).json({ message: "Email and Password are required!" });
        }

        const cleanEmail = email.toLowerCase().trim();

        // ৩. চেক করুন ইউজার অলরেডি আছে কি না
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        // ৪. পাসওয়ার্ড হ্যাশ করা
        const hashedPassword = await bcrypt.hash(password, 10);

        // ৫. নতুন ইউজার অবজেক্ট তৈরি (সবগুলো ফিল্ড ম্যাপ করা হয়েছে)
        const newUser = new User({
            role: role || 'partner',
            fullName,
            email: cleanEmail,
            password: hashedPassword,
            contact,
            orgName,
            authorisedPerson,
            address,
            expertCountries,
            experience,
            website,
            status: 'pending',
            walletBalance: 0
        });

        // ৬. ডাটা সেভ করা
        await newUser.save();
        
        res.status(201).json({ 
            success: true,
            message: "Registration successful! Waiting for Admin Approval." 
        });

    } catch (e) {
        console.error("❌ Registration Server Error:", e.message);
        res.status(500).json({ 
            success: false,
            error: "Server Error: " + e.message 
        });
    }
});

// ১. নতুন ইউনিভার্সিটি সেভ করা
app.post('/api/add-university', async (req, res) => {
    await connectDB();
    try {
        const newUni = new University(req.body);
        await newUni.save();
        res.status(201).json({ msg: "University Added!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ২. সব ইউজার লিস্ট দেখা (Admin UI এর জন্য)
app.get('/api/admin/users', async (req, res) => {
    await connectDB();
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৩. ইউজার এপ্রুভাল বা সাসপেন্ড করা
app.patch('/api/admin/users/:id/status', async (req, res) => {
    await connectDB();
    try {
        await User.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ msg: "Status Updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৪. এক্সপায়ারি ডেট আপডেট
app.patch('/api/admin/users/:id/expiry', async (req, res) => {
    await connectDB();
    try {
        await User.findByIdAndUpdate(req.params.id, { expiryDate: req.body.expiryDate });
        res.json({ msg: "Expiry Updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৫. ম্যানুয়াল ওয়ালেট আপডেট (সংশোধিত: ইনপুট অ্যামাউন্ট অনুযায়ী আপডেট)
// ৫. ম্যানুয়াল ওয়ালেট আপডেট (সংশোধিত: ইমেইল ট্রিম এবং লোয়ারকেস ফিক্সড)
app.patch('/api/applications/:id', async (req, res) => {
    await connectDB();
    try {
        const { pendingAmount, status } = req.body; 
        const amountFromAdmin = Number(pendingAmount) || 0; 

        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "Application not found" });

        // ১. অ্যাপ্লিকেশন আপডেট: পেন্ডিং থেকে মাইনাস
        const updatedApp = await Application.findByIdAndUpdate(
            req.params.id, 
            { 
                $inc: { pendingAmount: -amountFromAdmin }, 
                status: status || 'PARTIAL_PAID' 
            }, 
            { new: true }
        );

        // ২. পার্টনারের মেইন ওয়ালেটে টাকা যোগ করা (ইমেইল ফরম্যাট ফিক্সড)
        if (amountFromAdmin > 0 && appData.partnerEmail) {
            const partnerEmailClean = appData.partnerEmail.toLowerCase().trim(); // ইমেইল পরিষ্কার করা
            
            const updatedUser = await User.findOneAndUpdate(
                { email: partnerEmailClean }, 
                { $inc: { walletBalance: amountFromAdmin } }, 
                { new: true }
            );

            if (!updatedUser) {
                console.log("❌ User not found with email:", partnerEmailClean);
                return res.status(404).json({ error: "Partner User not found to update wallet" });
            }
            
            console.log("✅ Wallet Updated! New Balance:", updatedUser.walletBalance);
        }

        res.json({ 
            msg: `Success! ${amountFromAdmin} added to available wallet.`, 
            data: updatedApp 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// ১. উইথড্রয়াল রিকোয়েস্ট সাবমিট করা (পার্টনার যখন টাকা তোলার রিকোয়েস্ট পাঠাবে)
app.post('/api/withdrawals', async (req, res) => {
    await connectDB();
    try {
        // এখানে method যুক্ত করা হয়েছে (বিকাশ নম্বর বা ব্যাংক ডিটেইলস এর জন্য)
        const { email, amount, partnerName, method } = req.body;
        
        // চেক করা যে পার্টনারের ওয়ালেটে যথেষ্ট টাকা আছে কিনা
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            return res.status(404).json({ error: "User not found!" });
        }

        if (user.walletBalance < Number(amount)) {
            return res.status(400).json({ error: "Insufficient balance in wallet!" });
        }

        const newWithdraw = new Withdrawal({
            partnerEmail: email.toLowerCase().trim(),
            partnerName: partnerName,
            amount: Number(amount),
            method: method || 'Not Specified', // এখান থেকে পেমেন্ট মেথড সেভ হবে
            status: 'PENDING'
        });

        await newWithdraw.save();
        res.status(201).json({ msg: "Withdrawal request submitted successfully!" });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// ২. সব উইথড্রয়াল লিস্ট দেখা (এডমিনের জন্য)
app.get('/api/withdrawals', async (req, res) => {
    await connectDB();
    try {
        const list = await Withdrawal.find().sort({ timestamp: -1 });
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৩. উইথড্রয়াল এপ্রুভ করা এবং মেইন ওয়ালেট থেকে টাকা কাটা (এডমিনের জন্য)
app.post('/api/admin/approve-withdrawal', async (req, res) => {
    await connectDB();
    try {
        const { withdrawId, partnerEmail, amount } = req.body;

        // ১. উইথড্রয়াল স্ট্যাটাস আপডেট করা
        await Withdrawal.findByIdAndUpdate(withdrawId, { status: 'COMPLETED' });

        // ২. পার্টনারের মেইন ওয়ালেট থেকে টাকা মাইনাস করা
        const updatedUser = await User.findOneAndUpdate(
            { email: partnerEmail.toLowerCase().trim() },
            { $inc: { walletBalance: -Number(amount) } },
            { new: true }
        );

        res.json({ msg: "Payment completed and wallet updated!", newBalance: updatedUser.walletBalance });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/withdrawals/:id', async (req, res) => {
    await connectDB();
    try {
        await Withdrawal.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ msg: "Withdrawal status updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ১. প্রোফাইল আপডেট
app.patch('/api/user/profile', async (req, res) => {
    await connectDB();
    try {
        const { email, contact, orgName, authorisedPerson, address, logoUrl } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { contact, orgName, authorisedPerson, address, logoUrl },
            { new: true }
        );
        res.json(updatedUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ২. সিঙ্গেল অ্যাপ্লিকেশন ডিটেইলস (আইডি চেকসহ)
app.get('/api/applications/:id', async (req, res) => {
    await connectDB();
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID Format" });
        }
        const appData = await Application.findById(req.params.id);
        if (!appData) return res.status(404).json({ error: "No student found with this ID" });
        res.json(appData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৩. অ্যাপ্লিকেশন লকিং রুট (সংশোধিত)
app.patch('/api/lock-application/:id', async (req, res) => {
    await connectDB();
    try {
        const { staffEmail } = req.body;
        const appData = await Application.findById(req.params.id); // এখানে findById হবে
        if (!appData) return res.status(404).json({ error: "Application not found" });

        if (appData.lockBy && appData.lockBy !== staffEmail && appData.lockUntil > new Date()) {
            return res.status(403).json({ locked: true, message: `Locked by ${appData.lockBy}` });
        }

        const lockTime = new Date(Date.now() + 5 * 60000); 
        await Application.findByIdAndUpdate(req.params.id, { lockBy: staffEmail, lockUntil: lockTime });
        res.json({ locked: false, message: "Lock acquired" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৪. কমপ্লায়েন্স আপডেট
// ৪. কমপ্লায়েন্স আপডেট (index.js ফাইলে গিয়ে এটি পরিবর্তন করুন)
app.patch('/api/update-compliance', async (req, res) => {
    await connectDB(); 
    try {
        const { appId, status, complianceNote, staffEmail, commission } = req.body;
        
        let updateData = { 
            status, complianceNote, complianceMember: staffEmail,
            lockBy: null, lockUntil: null, timestamp: new Date()
        };

        // এই লাইনটিই আসল পরিবর্তন:
        // ৪. কমপ্লায়েন্স আপডেট - সংশোধিত ভার্সন
if (status === 'VERIFIED' || status === 'DOCS_VERIFIED' || status === 'DOC_VERIFIED') {
    updateData.pendingAmount = Number(commission) || 0;
} else {
    // অন্য যেকোনো স্ট্যাটাসে (যেমন: PENDING, MISSING_DOCS) টাকা ০ থাকবে
    updateData.pendingAmount = 0;
}

        const updatedApp = await Application.findByIdAndUpdate(appId, { $set: updateData }, { new: true });
        res.json({ msg: `Updated successfully to ${status}`, data: updatedApp });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৫. সব অ্যাপ্লিকেশন লিস্ট
app.get('/api/applications', async (req, res) => {
    await connectDB();
    try {
        const apps = await Application.find().sort({ timestamp: -1 });
        res.json(apps);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ৬. সব ইউনিভার্সিটি লিস্ট
app.get('/api/universities', async (req, res) => {
    await connectDB();
    try {
        const unis = await University.find();
        res.json(unis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ⭐ নতুন রুট: স্টুডেন্ট অ্যাপ্লিকেশন সাবমিট ---
app.post('/api/submit-application', async (req, res) => {
    await connectDB();
    try {
        const newApp = new Application(req.body);
        await newApp.save();
        res.status(201).json({ msg: "Application saved successfully", data: newApp });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ৭. লগইন রুট (Wallet Balance সহ - সংশোধিত)
app.post(['/api/login', '/api/auth/login'], async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // ✅ এই চেকটি না থাকলে অ্যাপ্রুভাল সিস্টেম কাজ করবে না
        if (user.status === 'pending') {
            return res.status(403).json({ msg: 'Your account is pending admin approval!' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ msg: 'Your account has been suspended!' });
        }

        res.json({ user: { 
            email: user.email, 
            name: user.fullName, 
            role: user.role,
            orgName: user.orgName, 
            logoUrl: user.logoUrl,
            walletBalance: user.walletBalance || 0 
        }});
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- 🔍 Public Tracking Route ---
app.get('/api/track-status', async (req, res) => {
    await connectDB();
    try {
        const { passportNo } = req.query;
        if (!passportNo) return res.status(400).json({ error: "Passport number is required" });

        // ডাটাবেস থেকে পাসপোর্ট অনুযায়ী অ্যাপ্লিকেশন খোঁজা
        const appData = await Application.findOne({ 
            passportNo: { $regex: new RegExp(passportNo, "i") } 
        });

        if (!appData) {
            return res.status(404).json({ message: "No record found with this passport number." });
        }

        // সিকিউরিটির জন্য শুধু প্রয়োজনীয় তথ্য পাঠানো হচ্ছে
        res.json({
            studentName: appData.studentName,
            passportNo: appData.passportNo,
            status: appData.status,
            university: appData.university
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth.html'));
});

module.exports = app;
