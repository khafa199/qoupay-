const Product = require('../models/product');
const User = require('../models/user');
const Order = require('../models/order');
const Deposit = require('../models/deposit');

exports.getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const successfulDeposits = await Deposit.aggregate([
            { $match: { status: 'success' } },
            { $group: { _id: null, total: { $sum: '$getBalance' } } }
        ]);

        res.render('admin/dashboard', {
            pageTitle: 'Admin Dashboard',
            totalUsers,
            totalProducts,
            totalOrders,
            totalSuccessfulDepositAmount: successfulDeposits.length > 0 ? successfulDeposits[0].total : 0,
        });
    } catch (error) {
        console.error(error);
        req.session.error = 'Gagal memuat dashboard admin.';
        res.redirect('/');
    }
};

exports.getProductsPage = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        res.render('admin/products', { pageTitle: 'Kelola Produk', products });
    } catch (err) {
        req.session.error = 'Gagal memuat produk.';
        res.redirect('/admin/dashboard');
    }
};

exports.getAddProductPage = (req, res) => {
    res.render('admin/add_product', { pageTitle: 'Tambah Produk Baru', product: {} });
};

exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock } = req.body;
        const newProduct = new Product({
            name,
            description,
            price: parseFloat(price),
            category,
            stock: parseInt(stock)
        });
        await newProduct.save();
        req.session.success = 'Produk berhasil ditambahkan.';
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.session.error = 'Gagal menambahkan produk: ' + err.message;
        res.render('admin/add_product', { pageTitle: 'Tambah Produk Baru', product: req.body, currentError: req.session.error });
        delete req.session.error;
    }
};

exports.getEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.session.error = 'Produk tidak ditemukan.';
            return res.redirect('/admin/products');
        }
        res.render('admin/edit_product', { pageTitle: 'Edit Produk', product });
    } catch (err) {
        req.session.error = 'Gagal memuat produk untuk diedit.';
        res.redirect('/admin/products');
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock, isActive } = req.body;
        await Product.findByIdAndUpdate(req.params.id, {
            name,
            description,
            price: parseFloat(price),
            category,
            stock: parseInt(stock),
            isActive: isActive === 'on'
        }, { new: true, runValidators: true });
        req.session.success = 'Produk berhasil diperbarui.';
        res.redirect('/admin/products');
    } catch (err) {
        console.error(err);
        req.session.error = 'Gagal memperbarui produk: ' + err.message;
        const product = await Product.findById(req.params.id);
        const updatedProductData = { ...product.toObject(), ...req.body };
        res.render('admin/edit_product', { pageTitle: 'Edit Produk', product: updatedProductData, currentError: req.session.error });
        delete req.session.error;
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.session.success = 'Produk berhasil dihapus.';
        res.redirect('/admin/products');
    } catch (err) {
        req.session.error = 'Gagal menghapus produk.';
        res.redirect('/admin/products');
    }
};

exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.render('admin/users', { pageTitle: 'Kelola Pengguna', users });
    } catch (error) {
        req.session.error = 'Gagal memuat daftar pengguna.';
        res.redirect('/admin/dashboard');
    }
};

exports.getOrdersPage = async (req, res) => {
     try {
        const orders = await Order.find({})
            .populate('user', 'username email')
            .populate('product', 'name')
            .sort({createdAt: -1});
        res.render('admin/orders', { pageTitle: 'Kelola Pesanan', orders });
    } catch (error) {
        req.session.error = 'Gagal memuat daftar pesanan.';
        res.redirect('/admin/dashboard');
    }
};

exports.getDepositsPage = async (req, res) => {
    try {
        const deposits = await Deposit.find({})
            .populate('user', 'username email')
            .sort({createdAt: -1});
        res.render('admin/deposits', { pageTitle: 'Kelola Deposit', deposits });
    } catch (error) {
        req.session.error = 'Gagal memuat daftar deposit.';
        res.redirect('/admin/dashboard');
    }
};

exports.approveDeposit = async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.depositId);
        if (!deposit) {
            req.session.error = 'Deposit tidak ditemukan.';
            return res.redirect('/admin/deposits');
        }
        if (deposit.status === 'success' && deposit.balanceUpdated) {
            req.session.error = 'Deposit ini sudah sukses dan saldo sudah diupdate.';
            return res.redirect('/admin/deposits');
        }

        const user = await User.findById(deposit.user);
        if (!user) {
            req.session.error = 'User untuk deposit ini tidak ditemukan.';
            return res.redirect('/admin/deposits');
        }

        if (!deposit.balanceUpdated) {
            user.balance += deposit.getBalance;
            await user.save();
            deposit.balanceUpdated = true;
        }
        deposit.status = 'success';
        await deposit.save();

        req.session.success = `Deposit Rp ${deposit.getBalance.toLocaleString('id-ID')} untuk user ${user.username} berhasil di-approve dan saldo telah ditambahkan.`;
        res.redirect('/admin/deposits');

    } catch (error) {
        console.error("Error approving deposit:", error);
        req.session.error = 'Gagal meng-approve deposit.';
        res.redirect('/admin/deposits');
    }
};