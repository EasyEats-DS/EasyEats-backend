const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ORDER_CONFIRMATION', 'DELIVERY_UPDATE'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED'],
        default: 'PENDING'
    },
    metadata: {
        email: String,
        phone: String,
        subject: String,
        sentVia: {
            email: { type: Boolean, default: false },
            sms: { type: Boolean, default: false }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);