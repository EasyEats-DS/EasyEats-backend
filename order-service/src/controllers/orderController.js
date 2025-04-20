const Order = require('../models/orderModel');
const { produceMessage } = require('../services/kafkaService');
const mongoose = require('mongoose');

// Create a new order
exports.createOrder = async (orderData) => {
  try {
    const { userId, products, totalAmount } = orderData;
    // Validate required fields
    if (!userId || !products || !totalAmount) {
      const error = new Error('Missing required fields');
      error.statusCode = 400;
      throw error;
    }
    // Create and save order
    const newOrder = new Order({
      userId,
      products,
      totalAmount,
      status: 'pending'
    });
    const savedOrder = await newOrder.save();
    // Send validation request to User Service
    await produceMessage('user-order', {
      orderId: savedOrder._id.toString(),
      userId,
      action: 'validate',
      timestamp: new Date().toISOString()
    });
    return savedOrder;
  } catch (error) {
    console.error('Error creating order:', error);
    const err = new Error(error.message || 'Server error while creating order');
    err.statusCode = error.statusCode || 500;
    throw err;
  }
};

// Get order by ID
exports.getOrderById = async (orderId) => {
  try {
    // Validate order ID
    if (!orderId) {
      const error = new Error('Order ID is required');
      error.statusCode = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const error = new Error('Invalid order ID format');
      error.statusCode = 400;
      throw error;
    }
    // Fetch order from database
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

// Get all orders with pagination
exports.getAllOrders = async (query) => {
  try {
    // Parse pagination parameters
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Fetch paginated orders
    const orders = await Order.find().skip(skip).limit(limit).lean();
    const totalOrders = await Order.countDocuments();
    // Return orders with pagination metadata
    return {
      success: true,
      data: {
        orders,
        pagination: {
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    const err = new Error('Failed to fetch orders');
    err.statusCode = 500;
    err.details = error.message;
    throw err;
  }
};

// Update order status
exports.updateOrderStatus = async (orderId, status) => {
  try {
    // Validate inputs
    if (!orderId || !status) {
      const error = new Error('Order ID and status are required');
      error.statusCode = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const error = new Error('Invalid order ID format');
      error.statusCode = 400;
      throw error;
    }
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.statusCode = 400;
      throw error;
    }
    // Update order in database
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    // Notify User Service of status update
    await produceMessage('order-status', {
      orderId,
      userId: order.userId,
      status,
      timestamp: new Date().toISOString()
    });
    return order;
  } catch (error) {
    console.error('Error updating order status:', error);
    const err = new Error(error.message || 'Server error while updating order status');
    err.statusCode = error.statusCode || 500;
    throw err;
  }
};