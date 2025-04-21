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

//Update the status of an order
exports.updateOrderStatus = async (orderId, status) => {
  try {
    if (!orderId) {
      const err = new Error('Order ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const err = new Error('Invalid order ID format');
      err.statusCode = 400;
      throw err;
    }
    const allowed = ['pending','processing','shipped','delivered','cancelled'];
    if (!allowed.includes(status)) {
      const err = new Error(`Invalid status: ${status}`);
      err.statusCode = 400;
      throw err;
    }
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }
    order.status = status;
    order.updatedAt = Date.now();
    const updated = await order.save();
    // notify other services
    await produceMessage('order-status', { orderId, userId: order.userId, status, timestamp: new Date().toISOString() });
    return updated;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Delete an order by its ID
exports.deleteOrderById = async (orderId) => {
  try {
    // Validate orderId presence & format
    if (!orderId) {
      const err = new Error('Order ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const err = new Error('Invalid order ID format');
      err.statusCode = 400;
      throw err;
    }

    // Attempt deletion
    const deleted = await Order.findByIdAndDelete(orderId);
    if (!deleted) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    // Return confirmation
    return { message: 'Order deleted successfully' };
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// Update an order by its ID
exports.updateOrder = async (orderId, orderData) => {
  try {
    // Validate orderId presence & format
    if (!orderId) {
      const err = new Error('Order ID is required');
      err.statusCode = 400;
      throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const err = new Error('Invalid order ID format');
      err.statusCode = 400;
      throw err;
    }

    // Validate required fields
    const { products, totalAmount, status } = orderData;
    if (!Array.isArray(products) || products.length === 0) {
      const err = new Error('Products array is required');
      err.statusCode = 400;
      throw err;
    }
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      const err = new Error('Valid totalAmount is required');
      err.statusCode = 400;
      throw err;
    }
    // validate status
    const allowed = ['pending','processing','shipped','delivered','cancelled'];
    if (status && !allowed.includes(status)) {
      const err = new Error(`Invalid status: ${status}`);
      err.statusCode = 400;
      throw err;
    }

    // Perform the update and return the new document
    const updated = await Order.findByIdAndUpdate(
      orderId,
      { products, totalAmount, ...(status && { status }), updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};