const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'LKR'
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: [
      // Internal payment statuses
      'PENDING',
      'SUCCESS',
      'FAILED',
      'REFUNDED',
      'CANCELLED',
      // Stripe payment statuses
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'succeeded',
      'canceled',
      'failed'
    ],
    default: 'requires_payment_method'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'stripe', 'paypal'],
    set: v => v.toLowerCase(),
    default: 'card'
  },
  transactionId: String,
  refundAmount: Number,
  metadata: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);