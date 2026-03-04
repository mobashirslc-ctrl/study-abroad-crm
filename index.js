// Partner Schema Definition
const partnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    files: [{
        studentName: String,
        university: String,
        status: { type: String, default: "Pending" },
        commission: { type: Number, default: 0 },
        lastUpdate: { type: Date, default: Date.now }
    }]
});

const Partner = mongoose.model('Partner', partnerSchema);

// Partner Registration API
app.post('/api/partners/register', async (req, res) => {
    try {
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.status(201).json({ message: "Partner Registered" });
    } catch (err) {
        res.status(400).json({ error: "Email already exists" });
    }
});

// Partner Login API
app.post('/api/partners/login', async (req, res) => {
    const { email, password } = req.body;
    const partner = await Partner.findOne({ email, password });
    if (partner) {
        res.json({ success: true, partnerId: partner._id, name: partner.name });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// Get Dashboard Data API
app.get('/api/partners/dashboard/:id', async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        res.json(partner);
    } catch (err) {
        res.status(404).send("Partner not found");
    }
});