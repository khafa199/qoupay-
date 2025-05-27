const User = require('../models/user');
const bcrypt = require('bcryptjs');

exports.getRegisterPage = (req, res) => {
    if (req.session.userId) return res.redirect('/user/profile');
    res.render('auth/register', { pageTitle: 'Register' });
};

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            req.session.error = 'Password tidak cocok.';
            return res.redirect('/register');
        }
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            req.session.error = 'User dengan email atau username ini sudah ada.';
            return res.redirect('/register');
        }
        user = new User({ username, email, password });
        if (username === 'adminqoupay' && (await User.countDocuments({role: 'admin'})) === 0) {
            user.role = 'admin';
        }
        await user.save();
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.success = 'Registrasi berhasil! Anda sekarang sudah login.';
        
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/user/profile');
        }

    } catch (err) {
        console.error(err);
        req.session.error = 'Terjadi kesalahan server saat registrasi.';
        res.redirect('/register');
    }
};

exports.getLoginPage = (req, res) => {
    if (req.session.userId) {
        if (req.session.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/user/profile');
    }
    res.render('auth/login', { pageTitle: 'Login' });
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.session.error = 'Email atau password salah.';
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.session.error = 'Email atau password salah.';
            return res.redirect('/login');
        }
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.success = 'Login berhasil!';

        let returnTo = req.session.returnTo;
        delete req.session.returnTo;

        if (user.role === 'admin') {
            if (returnTo && returnTo.startsWith('/admin')) {
                res.redirect(returnTo);
            } else {
                res.redirect('/admin/dashboard');
            }
        } else {
            if (returnTo && !returnTo.startsWith('/admin')) {
                 res.redirect(returnTo);
            } else {
                res.redirect('/user/profile');
            }
        }
        
    } catch (err) {
        console.error(err);
        req.session.error = 'Terjadi kesalahan server saat login.';
        res.redirect('/login');
    }
};

exports.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};