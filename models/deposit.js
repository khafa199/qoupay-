const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reffId: { type: String, required: true, unique: true },
    forestApiId: { type: String, unique: true, sparse: true },
    method: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0 },
    getBalance: { type: Number },
    qrImageUrl: { type: String },
    qrImageString: { type: String },
    status: { type: String, enum: ['pending', 'success', 'failed', 'expired'], default: 'pending' },
    paymentDetails: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    expiredAt: { type: Date },
    balanceUpdated: { type: Boolean, default: false }
});

module.exports = mongoose.model('Deposit', DepositSchema);