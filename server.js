const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const User = require('./models/User');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();


// 1. DATABASE CONNECTION
const dbUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/tourizio';
mongoose.connect(dbUrl, {
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log("DB Connected to:", dbUrl.includes('127.0.0.1') ? 'Localhost' : 'Cloud');
}).catch((err) => {
    console.log("DB Connection Failed:", err.message);
});

// 2. CONFIGURATION
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'tourizio_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Secure in production
}));

// Make user available to views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentPath = req.path;
    next();
});

// 3. AUTH MIDDLEWARE
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth');
};

// 4. STORAGE & EMAIL

// Multer with File Filter
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Nodemailer (Gmail SMTP)
// USER ACTION REQUIRED: Replace placeholders below
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'YOUR_GMAIL_ADDRESS',
        pass: process.env.GMAIL_APP_PASSWORD || 'YOUR_APP_PASSWORD'
    }
});

// Helper to send email (CONSOLE MODE)
async function sendEmail(email, subject, html) {
    // Extract OTP from HTML roughly for logging
    const otpMatch = html.match(/<b>(.*?)<\/b>/);
    const otp = otpMatch ? otpMatch[1] : "UNKNOWN";

    console.log("---------------------------------------------------");
    console.log(`📧 [MOCK EMAIL] To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP CODE: ${otp}`);
    console.log("---------------------------------------------------");
    return true;
}

// 5. ROUTES

const destinations = [
    { id: 'agra', name: 'Taj Mahal, Agra', price: 2500, image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=2071&q=80', days: 'Flexible' },
    { id: 'rishikesh', name: 'Rishikesh', price: 1500, image: 'https://media1.thrillophilia.com/filestore/l1stgsdtm1wlcgkfhkg49pers7qj_WDEFRGTYH.png', days: 'Flexible' },
    { id: 'andaman', name: 'Andaman', price: 4000, image: 'https://www.diveandaman.com/storage/blogs/190523064249-scuba-diving-in-andaman-banner1.jpg', days: 'Flexible' },
    { id: 'jaipur', name: 'Jaipur', price: 2000, image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1770&q=80', days: 'Flexible' },
    { id: 'kerala', name: 'Kerala', price: 3500, image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1932&q=80', days: 'Flexible' },
    { id: 'goa', name: 'Goa', price: 3000, image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1974&q=80', days: 'Flexible' }
];

app.get('/', (req, res) => res.render('index', { destinations }));
app.get('/destinations', (req, res) => res.render('destinations', { destinations }));

// Auth Pages
app.get('/auth', (req, res) => {
    if (req.session.user) res.redirect('/');
    else res.render('auth');
});

app.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Server-Side Validation
        if (!firstName || !lastName || !email || !password) {
            return res.send('<script>alert("All fields are required"); window.history.back();</script>');
        }
        if (password.length < 6) {
            return res.send('<script>alert("Password must be at least 6 characters"); window.history.back();</script>');
        }

        if (await User.findOne({ email })) return res.send('<script>alert("User exists"); window.location.href="/auth";</script>');

        const newUser = new User({ firstName, lastName, email, password });
        await newUser.save();
        res.send('<script>alert("Signup Successful"); window.location.href="/auth";</script>');
    } catch (e) {
        res.send(`<script>alert("Error: ${e.message}"); window.history.back();</script>`);
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.send('<script>alert("All fields are required"); window.history.back();</script>');
        }

        const user = await User.findOne({ email });
        if (user && user.password === password) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.send('<script>alert("Invalid Credentials"); window.location.href="/auth";</script>');
        }
    } catch (e) {
        res.send(`<script>alert("Error: ${e.message}"); window.history.back();</script>`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Protected Pages
app.get('/booking', isAuthenticated, (req, res) => res.render('booking', { destinations }));
app.get('/contact', isAuthenticated, (req, res) => res.render('contact'));
app.post('/contact', isAuthenticated, (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }
    // Mock processing
    console.log(`[Contact Form] From: ${name} (${email}) - Message: ${message}`);
    res.json({ success: true, message: 'Message sent successfully' });
});
app.get('/profile', isAuthenticated, (req, res) => res.render('profile'));

// --- PROFILE ACTIONS ---

// 1. Upload Avatar
app.post('/upload-avatar', isAuthenticated, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
        const user = await User.findById(req.session.user._id);
        user.profilePic = '/uploads/' + req.file.filename;
        await user.save();
        req.session.user.profilePic = user.profilePic;
        res.json({ success: true, path: user.profilePic });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed' });
    }
});

// 2. Update Age
app.post('/update-age', isAuthenticated, async (req, res) => {
    try {
        const { age } = req.body;
        if (!age || isNaN(age) || age < 1 || age > 150) {
            return res.status(400).json({ success: false, message: 'Invalid age (1-150)' });
        }

        const user = await User.findById(req.session.user._id);
        user.age = age;
        await user.save();
        req.session.user.age = age;
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
});

// 3. Email Update Flow

// Step A: Send OTP to CURRENT Email
app.post('/initiate-email-change', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60000;
        await user.save();

        const emailSent = await sendEmail(user.email, "Security Verification",
            `<h3>Email Change Request</h3><p>Your verification code is: <b>${otp}</b></p>`);

        if (emailSent) {
            res.json({ success: true });
        } else {
            // If email fails, return error (likely bad creds)
            res.status(500).json({ success: false, message: "Failed to send email. Check Server Config." });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Step B: Verify OTP
app.post('/verify-owner-otp', isAuthenticated, async (req, res) => {
    try {
        const { otp } = req.body;
        const user = await User.findById(req.session.user._id);

        if (user.otp === otp && user.otpExpires > Date.now()) {
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            // Set session flag to allow next step
            req.session.emailChangeAuthorized = true;
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP" });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// Step C: Update Email
app.post('/finalize-email-update', isAuthenticated, async (req, res) => {
    try {
        if (!req.session.emailChangeAuthorized) {
            return res.status(403).json({ success: false, message: "Unauthorized. Verify OTP first." });
        }

        const { newEmail } = req.body;
        if (await User.findOne({ email: newEmail })) {
            return res.status(400).json({ success: false, message: "Email already taken" });
        }

        const user = await User.findById(req.session.user._id);
        user.email = newEmail;
        await user.save();

        // Update session & clear flag
        req.session.user.email = newEmail;
        req.session.emailChangeAuthorized = false;

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// --- BOOKINGS ---
const Booking = require('./models/Booking');

app.get('/my-bookings', isAuthenticated, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.session.user._id }).sort({ createdAt: -1 });
        res.render('my-bookings', { bookings });
    } catch (e) {
        res.send("Error");
    }
});

app.post('/cancel-booking', isAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.bookingId);
        if (!booking || booking.user.toString() !== req.session.user._id) return res.status(403).send("Unauthorized");

        const hours = (Date.now() - new Date(booking.createdAt).getTime()) / 36e5;
        if (hours > 24) return res.status(400).send("Expired");

        booking.status = 'Cancelled';
        await booking.save();
        res.send("Cancelled");
    } catch (e) {
        res.status(500).send("Error");
    }
});

app.post('/booking', isAuthenticated, async (req, res) => {
    try {
        console.log("Received Booking Data:", req.body); // Debugging

        // Validation
        if (!req.body.destination || !req.body.checkin || !req.body.checkout) {
            return res.status(400).send("Missing Details");
        }
        if (parseInt(req.body.guestsCount) < 1) {
            return res.status(400).send("At least 1 guest required");
        }

        const newBooking = new Booking({
            user: req.session.user._id,
            destination: req.body.destination,
            checkIn: req.body.checkin,   // Map checkin -> checkIn
            checkOut: req.body.checkout, // Map checkout -> checkOut
            guestsCount: req.body.guestsCount,
            totalCost: req.body.total,   // Map total -> totalCost
            guests: req.body.guests
        });

        await newBooking.save();
        console.log("Booking Saved:", newBooking);
        res.status(200).send('OK');
    } catch (e) {
        console.error("Booking Error:", e);
        res.status(500).send("Error: " + e.message);
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
