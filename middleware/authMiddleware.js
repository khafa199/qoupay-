module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl;
        req.session.error = 'Anda harus login terlebih dahulu.';
        return res.redirect('/login');
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        req.session.error = 'Anda tidak memiliki izin untuk mengakses halaman ini.';
        return res.status(403).redirect('/');
    }
    next();
};