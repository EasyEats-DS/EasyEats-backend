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
        enum: ['PENDING', 'SENT', 'FAILED', 'READ'],
        default: 'PENDING'
    },
    preferredChannel: {
        type: String,
        enum: ['EMAIL', 'SMS', 'BOTH'],
        default: 'BOTH'
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
    readAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', notificationSchema);