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
    const orderResult = await sendMessageWithResponse('order-request', {
      action: 'getOrder',
      payload: { id: req.params.id }
    });
    
    return res.json(orderResult);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error fetching order' 
    });
  }
});

module.exports = router;