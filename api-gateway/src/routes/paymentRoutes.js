const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    // Validate request body
    const { amount, currency, orderId, userId } = req.body;
    if (!amount || !orderId || !userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: amount, orderId, or userId' 
      });
    }

    // Send request to payment service
    const result = await sendMessageWithResponse('payment-request', {
      action: 'createPaymentIntent',
      payload: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'lkr',
        orderId,
        userId
      }
    });

    // Handle successful response
    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error creating payment intent'
    });
  }
});


// Payment webhook
router.post('/webhook', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('payment-request', {
      action: 'handleWebhook',
      payload: req.body
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error processing webhook'
    });
  }
});

// Get payment status
router.get('/status/:orderId', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('payment-request', {
      action: 'getPaymentStatus',
      payload: { orderId: req.params.orderId }
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error getting payment status'
    });
  }
});

// Process refund
router.post('/refund', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('payment-request', {
      action: 'processRefund',
      payload: req.body
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error processing refund'
    });
  }
});

// Get payment by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('payment-request', {
      action: 'getPaymentByOrderId',
      payload: { orderId: req.params.orderId }
    });
    if (!result) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error fetching payment'
    });
  }
});

// Get user payment history
router.get('/user/:userId/history', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('payment-request', {
      action: 'getPaymentsByUserId',
      payload: { userId: req.params.userId }
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error fetching payment history'
    });
  }
});

module.exports = router;