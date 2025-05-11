const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createPaymentIntent, confirmPayment, createRefund } = require('../services/stripeService');
const { produceMessage } = require('../services/kafkaService');
const Payment = require('../models/paymentModel');

exports.initiatePayment = async (orderData) => {
  try {
    console.log('Initiating payment with data:', orderData);
    const { orderId, userId, amount, currency = 'usd' } = orderData;
    
    // Check if payment exists
    console.log('Checking for existing payment with orderId:', orderId);
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment) {
      console.log('Found existing payment:', existingPayment);
      if (existingPayment.status === 'PENDING') {
        return {
          clientSecret: existingPayment.clientSecret,
          paymentIntentId: existingPayment.paymentIntentId
        };
      }
      throw new Error(`Payment already exists for order ${orderId} with status ${existingPayment.status}`);
    }
    
    // Create payment record with CARD as payment method
    console.log('Creating payment record in database');
    const payment = new Payment({
      orderId,
      userId,
      amount,
      currency,
      paymentMethod: 'CARD', // Changed from 'stripe' to 'CARD'
      status: 'PENDING'
    });

    console.log('Saving payment record...');
    const savedPayment = await payment.save();
    console.log('Payment record saved:', savedPayment);
    
    return {
      success: true,
      paymentId: savedPayment._id,
      status: savedPayment.status
    };
  } catch (error) {
    console.error('Error in initiatePayment:', error);
    throw error;
  }
};

exports.handlePaymentSuccess = async (paymentData) => {
  try {
    console.log('Handling payment success with data:', paymentData);
    const { paymentIntentId } = paymentData;
    
    // Confirm payment with Stripe
    console.log('Confirming payment with Stripe for paymentIntentId:', paymentIntentId);
    const payment = await confirmPayment(paymentIntentId);
    console.log('Payment confirmed with Stripe:', payment);
    
    // Update payment record in database
    console.log('Updating payment record in database for paymentIntentId:', paymentIntentId);
    const updatedPayment = await Payment.findOneAndUpdate(
      { paymentIntentId },
      { 
        status: 'completed',
        metadata: {
          stripePaymentId: payment.id,
          paymentMethod: payment.payment_method
        }
      },
      { new: true }
    );
    console.log('Payment record updated:', updatedPayment);
    
    return { success: true, payment: updatedPayment };
  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error);
    throw error;
  }
};

exports.processRefund = async (refundData) => {
  try {
    console.log('Processing refund with data:', refundData);
    const { paymentIntentId } = refundData;
    
    // Process refund with Stripe
    console.log('Creating refund with Stripe for paymentIntentId:', paymentIntentId);
    const refund = await createRefund(paymentIntentId);
    console.log('Refund created with Stripe:', refund);
    
    // Update payment record in database
    console.log('Updating payment record in database for refund:', refund);
    const updatedPayment = await Payment.findOneAndUpdate(
      { paymentIntentId },
      { 
        status: 'refunded',
        refundId: refund.id,
        metadata: {
          refundReason: refundData.reason || 'customer_requested'
        }
      },
      { new: true }
    );
    console.log('Payment record updated for refund:', updatedPayment);
    
    return { success: true, payment: updatedPayment };
  } catch (error) {
    console.error('Error in processRefund:', error);
    throw error;
  }
};

exports.getPaymentsByUserId = async (userId) => {
  try {
    console.log('Fetching payments for userId:', userId);
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    console.log('Payments fetched:', payments);
    return payments;
  } catch (error) {
    console.error('Error in getPaymentsByUserId:', error);
    throw error;
  }
};

exports.getPaymentByOrderId = async (orderId) => {
  try {
    console.log('Fetching payment for orderId:', orderId);
    const payment = await Payment.findOne({ orderId });
    console.log('Payment fetched:', payment);
    return payment;
  } catch (error) {
    console.error('Error in getPaymentByOrderId:', error);
    throw error;
  }
};

// Create payment intent
exports.createPaymentIntent = async (data) => {
  try {
    const { amount, currency = 'lkr', orderId, userId } = data;

    if (!amount || !orderId || !userId) {
      throw new Error('Missing required fields: amount, orderId, or userId');
    }

    // Create payment intent with Stripe
    const paymentIntent = await createPaymentIntent(amount, currency.toLowerCase());

    // Save payment record to database with original amount (not multiplied by 100)
    const payment = new Payment({
      orderId,
      userId,
      amount: amount, // Store original amount without multiplication
      currency,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
    await payment.save();

    return {
      success: true,
      paymentId: payment._id,
      clientSecret: paymentIntent.client_secret,
      amount: amount, // Return original amount without multiplication
      currency
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Get payment status
exports.getPaymentStatus = async (orderId) => {
  try {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      updatedAt: payment.updatedAt
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

// Handle webhook
exports.handleWebhook = async (webhookData, produceMessage) => {
  try {
    const { orderId, status, transactionId } = webhookData;
    
    if (!orderId || !status) {
      throw new Error('Missing required webhook fields');
    }

    // Update payment status
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = status;
    payment.transactionId = transactionId;
    payment.updatedAt = new Date();
    await payment.save();

    // Notify order service about payment status
    if (produceMessage) {
      await produceMessage('payment-status', {
        orderId,
        status,
        transactionId,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Payment status updated successfully',
      status: payment.status
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
};

// Process refund
exports.processRefund = async (refundData) => {
  try {
    const { orderId, amount } = refundData;
    
    if (!orderId || !amount) {
      throw new Error('Missing required refund fields');
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'REFUNDED';
    payment.refundAmount = amount;
    payment.updatedAt = new Date();
    await payment.save();

    return {
      success: true,
      message: 'Refund processed successfully',
      refundAmount: amount
    };
  } catch (error) {
    console.error('Refund processing error:', error);
    throw error;
  }
};