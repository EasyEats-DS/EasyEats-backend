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

// Get order by ID
exports.getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    return { order };
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

// Get all orders with pagination (user‑service style)
exports.getOrders = async (query) => {
  try {
    const page  = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip  = (page - 1) * limit;

    const orders      = await Order.find().skip(skip).limit(limit).lean();
    const totalOrders = await Order.countDocuments();

    return {
      success: true,
      data: {
        orders,
        pagination: {
          total:       totalOrders,
          totalPages:  Math.ceil(totalOrders / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw {
      statusCode: 500,
      message:    'Failed to fetch orders',
      details:    error.message
    };
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