const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending_payment', 'paid', 'processing', 'completed', 'cancelled'],
        default: 'pending_payment'
    },
    transactionDetails: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);