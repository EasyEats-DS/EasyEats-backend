const express = require('express');
const { 
  initiatePayment, 
  handlePaymentSuccess, 
  processRefund,
  getPaymentsByUserId,
  getPaymentByOrderId,
  createPaymentIntent,
  getPaymentStatus,
  handleWebhook
} = require('../controllers/paymentController');

const router = express.Router();

// Payment operations
router.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentDetails = await initiatePayment(req.body);
    res.status(200).json(paymentDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm-payment', async (req, res) => {
  try {
    const result = await handlePaymentSuccess(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/refund', async (req, res) => {
  try {
    const result = await processRefund(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment queries
router.get('/user/:userId/history', async (req, res) => {
  try {
    const payments = await getPaymentsByUserId(req.params.userId);
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/order/:orderId', async (req, res) => {
  try {
    const payment = await getPaymentByOrderId(req.params.orderId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment status
router.get('/status/:orderId', async (req, res) => {
  try {
    const status = await getPaymentStatus(req.params.orderId);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

// Payment webhook
router.post('/webhook', async (req, res) => {
  try {
    const result = await handleWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

module.exports = router;