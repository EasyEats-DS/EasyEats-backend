const Order = require('../models/orderModel');
const { produceMessage } = require('../services/kafkaService');

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

exports.getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

exports.updateOrderStatus = async (orderId, status) => {
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    
    order.status = status;
    order.updatedAt = Date.now();
    
    const updatedOrder = await order.save();
    
    // Send message to Kafka about order status update
    await produceMessage('order-status', {
      orderId,
      userId: order.userId,
      status,
      timestamp: new Date().toISOString()
    });
    
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};