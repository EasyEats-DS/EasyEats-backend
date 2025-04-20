const Order = require('../models/orderModel');
const { produceMessage } = require('../services/kafkaService');
const mongoose = require('mongoose');

exports.createOrder = async (orderData) => {
  try {
    const { userId, products, totalAmount } = orderData;
    
    if (!userId || !products || !totalAmount) {
      throw new Error('Missing required fields');
    }
    
    // Create a new order
    const newOrder = new Order({
      userId,
      products,
      totalAmount,
      status: 'pending'
    });
    
    const savedOrder = await newOrder.save();
    
    // Send message to Kafka for user validation
    await produceMessage('user-order', {
      orderId: savedOrder._id.toString(),
      userId,
      action: 'validate',
      timestamp: new Date().toISOString()
    });
    
    return savedOrder;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

//Get order by ID controller
exports.getOrderById = async (orderId) => {
  try {
    // Validate order ID
    if (!orderId) {
      const error = new Error('Order ID is required');
      error.statusCode = 400;
      throw error;
    }
    // Validate MongoDB ObjectID format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const error = new Error('Invalid order ID format');
      error.statusCode = 400;
      throw error;
    }
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    return { success: true, order };
  } catch (error) {
    console.error('Error fetching order:', error);
    const err = new Error(error.message || 'Server error while retrieving order');
    err.statusCode = error.statusCode || 500;
    throw err;
  }
};

// exports.updateOrderStatus = async (orderId, status) => {
//   try {
//     const order = await Order.findById(orderId);
    
//     if (!order) {
//       const error = new Error('Order not found');
//       error.statusCode = 404;
//       throw error;
//     }
    
//     order.status = status;
//     order.updatedAt = Date.now();
    
//     const updatedOrder = await order.save();
    
//     // Send message to Kafka about order status update
//     await produceMessage('order-status', {
//       orderId,
//       userId: order.userId,
//       status,
//       timestamp: new Date().toISOString()
//     });
    
//     return updatedOrder;
//   } catch (error) {
//     console.error('Error updating order status:', error);
//     throw error;
//   }
// };