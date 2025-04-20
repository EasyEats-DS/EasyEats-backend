const express = require('express');
const { sendMessageWithResponse } = require('../services/kafkaService');
const router = express.Router();

// Route to get all orders with pagination
router.get('/', async (req, res) => {
  try {
    // Send Kafka message to fetch all orders
    const ordersResult = await sendMessageWithResponse('order-request', {
      action: 'getAllOrders',
      payload: {
        page: req.query.page,
        limit: req.query.limit
      }
    });
    return res.json(ordersResult);
  } catch (error) {
    console.error('Error fetching all orders:', error.message);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Error fetching all orders'
    });
  }
});

// Route to get a single order by ID
router.get('/:id', async (req, res) => {
  try {
    // Send Kafka message to fetch order by ID
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

// Route to create a new order
router.post('/', async (req, res) => {
  try {
    // Send Kafka message to create order
    const orderResult = await sendMessageWithResponse('order-request', {
      action: 'createOrder',
      payload: req.body
    });
    return res.status(201).json(orderResult);
  } catch (error) {
    console.error('Error creating order:', error.message);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Error creating order'
    });
  }
});

module.exports = router;