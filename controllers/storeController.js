const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
exports.getProductsPage = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        res.render('store/index', {
            pageTitle: `${process.env.STORE_NAME} - Home`,
            products
        });
    } catch (err) {
        console.error(err);
        req.session.error = "Tidak dapat memuat produk.";
        res.redirect('/');
    }
};

exports.getProductDetailPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product || !product.isActive) {
            req.session.error = "Produk tidak ditemukan.";
            return res.redirect('/products');
        }
        res.render('store/product_detail', {
            pageTitle: product.name,
            product
        });
    } catch (err) {
        console.error(err);
        req.session.error = "Tidak dapat memuat detail produk.";
        res.redirect('/products');
    }
};

exports.buyProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.userId;

        const product = await Product.findById(productId);
        const user = await User.findById(userId);

        if (!product || !product.isActive) {
            req.session.error = 'Produk tidak tersedia.';
            return res.redirect('/products');
        }
        if (product.stock <= 0) {
            req.session.error = 'Stok produk habis.';
            return res.redirect(`/product/${productId}`);
        }

        if (user.balance < product.price) {
            req.session.error = 'Saldo tidak mencukupi. Silakan deposit terlebih dahulu.';
            return res.redirect('/user/deposit');
        }

        user.balance -= product.price;
        await user.save();

        product.stock -= 1;
        await product.save();

        const order = new Order({
            user: userId,
            product: productId,
            totalPrice: product.price,
            paymentMethod: 'balance',
            status: 'paid'
        });
        await order.save();

        const productName = product.name;
        const message = `Halo ${process.env.STORE_NAME}, saya telah berhasil melakukan pembelian ${productName} (Order ID: ${order._id}). Mohon diproses. Terima kasih.`;
        const whatsappUrl = `${process.env.STORE_WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;

        req.session.success = `Pembelian ${productName} berhasil! Saldo Anda telah dikurangi.`;
        res.render('store/buy_confirmation', {
            pageTitle: 'Pembelian Berhasil',
            product,
            order,
            whatsappUrl,
            message: `Pembelian ${productName} berhasil! Saldo Anda telah dikurangi. Silakan hubungi kami di WhatsApp untuk proses selanjutnya.`
        });

    } catch (err) {
        console.error(err);
        req.session.error = 'Terjadi kesalahan saat proses pembelian.';
        res.redirect('/products');
    }
};