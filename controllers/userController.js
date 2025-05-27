const axios = require('axios');
const User = require('../models/user');
const Deposit = require('../models/deposit');
const Order = require('../models/order');
const { v4: uuidv4 } = require('uuid');

exports.getProfilePage = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        const orders = await Order.find({ user: req.session.userId }).populate('product').sort({ createdAt: -1 });
        const deposits = await Deposit.find({ user: req.session.userId }).sort({ createdAt: -1 });
        if (!user) return res.redirect('/login');
        res.render('user/profile', {
            pageTitle: 'Profil Saya',
            user,
            orders,
            deposits
        });
    } catch (err) {
        console.error(err);
        req.session.error = "Tidak dapat memuat profil.";
        res.redirect('/');
    }
};

exports.getDepositPage = async (req, res) => {
    try {
        const forestApiKey = process.env.FOREST_API_KEY;
        const response = await axios.get(`https://forestapi.web.id/api/h2h/deposit/methods?api_key=${forestApiKey}`);
        if (response.data && response.data.status === 'success') {
            res.render('user/deposit', {
                pageTitle: 'Deposit Saldo',
                paymentMethods: response.data.data.filter(m => m.status === 'active')
            });
        } else {
            req.session.error = 'Gagal mengambil metode pembayaran dari ForestAPI.';
            res.redirect('/user/profile');
        }
    } catch (error) {
        console.error('Error fetching payment methods:', error.response ? error.response.data : error.message);
        req.session.error = 'Terjadi kesalahan saat mengambil metode pembayaran.';
        res.redirect('/user/profile');
    }
};

exports.createDeposit = async (req, res) => {
    const { amount, method } = req.body;
    const forestApiKey = process.env.FOREST_API_KEY;
    const userId = req.session.userId;

    if (!amount || !method || parseFloat(amount) <= 0) {
        req.session.error = 'Jumlah dan metode deposit harus diisi dengan benar.';
        return res.redirect('/user/deposit');
    }
    if (parseFloat(amount) < 2000) {
        req.session.error = 'Jumlah deposit minimal Rp 2.000.';
        return res.redirect('/user/deposit');
    }

    const reffId = `DEP-${userId.toString().slice(-4)}-${Date.now()}-${uuidv4().slice(0,6)}`;

    try {
        const user = await User.findById(userId);
        if (!user) {
            req.session.error = 'User tidak ditemukan.';
            return res.redirect('/login');
        }

        const apiURL = `https://forestapi.web.id/api/h2h/deposit/create`;
        const params = {
            api_key: forestApiKey,
            reff_id: reffId,
            method: method,
            nominal: parseInt(amount),
            fee_by_customer: false
        };

        const response = await axios.get(apiURL, { params });

        if (response.data && response.data.status === 'success') {
            const depositData = response.data.data;
            const newDeposit = new Deposit({
                user: userId,
                reffId: reffId,
                forestApiId: depositData.id,
                method: method,
                amount: depositData.nominal,
                fee: depositData.fee,
                getBalance: depositData.get_balance,
                qrImageUrl: depositData.qr_image_url,
                qrImageString: depositData.qr_image_string,
                status: depositData.status,
                expiredAt: new Date(depositData.expired_at.replace(" ", "T") + "Z"),
                paymentDetails: depositData
            });
            await newDeposit.save();
            res.redirect(`/user/deposit/status/${newDeposit._id}`);
        } else {
            console.error("ForestAPI Deposit Error:", response.data);
            req.session.error = response.data.message || 'Gagal membuat permintaan deposit ke ForestAPI.';
            res.redirect('/user/deposit');
        }
    } catch (error) {
        console.error('Error creating deposit:', error.response ? error.response.data : error.message);
        req.session.error = 'Terjadi kesalahan server saat membuat deposit.';
        res.redirect('/user/deposit');
    }
};

exports.getDepositStatusPage = async (req, res) => {
    try {
        const deposit = await Deposit.findOne({ _id: req.params.depositId, user: req.session.userId });
        if (!deposit) {
            req.session.error = 'Deposit tidak ditemukan.';
            return res.redirect('/user/profile');
        }

        if (deposit.status === 'success' && !deposit.balanceUpdated) {
            const user = await User.findById(req.session.userId);
            user.balance += deposit.getBalance;
            await user.save();
            deposit.balanceUpdated = true;
            await deposit.save();
            req.session.success = `Deposit Rp ${deposit.getBalance.toLocaleString('id-ID')} berhasil ditambahkan ke saldo Anda.`;
        }

        res.render('user/deposit_status', {
            pageTitle: 'Status Deposit',
            deposit,
            storePhoneNumber: process.env.STORE_PHONE_NUMBER,
            storeWhatsappLink: process.env.STORE_WHATSAPP_LINK,
        });

    } catch (err) {
        console.error(err);
        req.session.error = "Gagal memuat status deposit.";
        res.redirect('/user/profile');
    }
};

exports.checkDepositStatusApi = async (req, res) => {
    const { forestApiReffId } = req.params;
    const userId = req.session.userId;

    try {
        const deposit = await Deposit.findOne({ reffId: forestApiReffId, user: userId });
        if (!deposit) {
            return res.status(404).json({ success: false, message: 'Deposit tidak ditemukan.' });
        }

        if (['success', 'failed', 'expired'].includes(deposit.status)) {
            return res.json({ success: true, message: `Status sudah final: ${deposit.status}`, data: deposit });
        }
        
        res.json({ success: true, message: `Status saat ini (lokal): ${deposit.status}. Cek manual atau tunggu notifikasi.`, data: deposit });

    } catch (error) {
        console.error('Error checking deposit status with API:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Gagal memeriksa status deposit dengan API.' });
    }
};