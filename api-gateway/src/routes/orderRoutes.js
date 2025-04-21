const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

// Create a new order
router.post('/', async (req, res) => {
  try {
    // First, validate that the user exists
    const userValidation = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      payload: { userId: req.body.userId }
    });
    
    if (!userValidation.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user exists, create the order
    const orderResult = await sendMessageWithResponse('order-request', {
      action: 'createOrder',
      payload: req.body
    });
    
    return res.status(201).json(orderResult);
  } catch (error) {
    console.error('Error creating order:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error creating order' 
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    // Send Kafka message to Order Service
    const orderResult = await sendMessageWithResponse('order-request', {
      action: 'getOrder',
      payload: { orderId: req.params.id } // Pass order ID from URL
    });
    return res.json(orderResult);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Get all orders with pagination
router.get('/', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await sendMessageWithResponse('order-request', {
      action:  'getOrders',
      payload: { page, limit }
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('order-request', {
      action: 'updateOrderStatus',
      payload: { orderId: req.params.id, status: req.body.status },
      correlationId: req.headers['x-correlation-id'] || Date.now().toString()
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});


module.exports = router;