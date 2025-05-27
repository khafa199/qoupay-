require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const connectDB = require('./config/db');
const User = require('./models/user');

const authRoutes = require('./routes/auth');
const storeRoutes = require('./routes/store');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use(async (req, res, next) => {
    res.locals.currentUser = null;
    res.locals.storeName = process.env.STORE_NAME;
    res.locals.storePhoneNumber = process.env.STORE_PHONE_NUMBER;
    res.locals.storeWhatsappLink = process.env.STORE_WHATSAPP_LINK;
    res.locals.success = req.session.success || '';
    res.locals.error = req.session.error || '';
    delete req.session.success;
    delete req.session.error;

    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                res.locals.currentUser = user;
            } else {
                req.session.destroy();
            }
        } catch (err) {
            console.error("Error fetching user for session:", err);
        }
    }
    next();
});

app.use('/', authRoutes);
app.use('/', storeRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.redirect('/products');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`QOUPAY STORE running on http://localhost:${PORT}`);
});