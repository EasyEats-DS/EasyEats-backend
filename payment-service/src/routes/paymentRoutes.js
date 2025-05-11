const express = require('express');
const { 
  initiatePayment, 
  handlePaymentSuccess, 
  processRefund,
  getPaymentsByUserId,
  getPaymentByOrderId,
  getPaymentStatus,
  handleWebhook
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/intent', initiatePayment);
router.post('/confirm', handlePaymentSuccess);
router.post('/refund', processRefund);
router.get('/user/:userId', getPaymentsByUserId);
router.get('/order/:orderId', getPaymentByOrderId);
router.get('/status/:orderId', getPaymentStatus);
router.post('/webhook', handleWebhook);

module.exports = router;