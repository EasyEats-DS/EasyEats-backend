const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

// All routes will use sendMessageWithResponse to communicate with notification service on port 5005
// The client will call these routes through the API gateway on port 5003

// Send order confirmation notification
router.post('/order-confirmation', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'sendOrderConfirmation',
      payload: {
        orderId: req.body.orderId,
        userId: req.body.userId,
        email: req.body.customerEmail,
        phone: req.body.customerPhone,
        total: req.body.totalAmount,
        preferredChannel: 'BOTH',
        metadata: {
          ...req.body.metadata,
          email: req.body.customerEmail,
          phone: req.body.customerPhone,
          subject: 'Order Confirmation - EasyEats'
        }
      }
    }, 15000);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error sending order confirmation:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Error sending order confirmation' 
    });
  }
});

// Send delivery update notification
router.post('/delivery-update', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'sendDeliveryUpdate',
      payload: {
        orderId: req.body.orderId,
        userId: req.body.userId,
        status: req.body.status,
        email: req.body.customerEmail,
        phone: req.body.customerPhone,
        preferredChannel: 'BOTH',
        metadata: {
          ...req.body.metadata,
          email: req.body.customerEmail,
          phone: req.body.customerPhone,
          subject: 'Delivery Update - EasyEats'
        }
      }
    }, 15000);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error sending delivery update:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error sending delivery update' 
    });
  }
});

// Get notification history by order ID
router.get('/history/:orderId', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'getNotificationHistory',
      payload: { orderId: req.params.orderId }
    }, 15000); // explicitly set timeout to 15 seconds
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notification history:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error fetching notification history' 
    });
  }
});

// Get notifications by status
router.get('/status/:status', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'getNotificationsByStatus',
      payload: { 
        status: req.params.status,
        page: req.query.page,
        limit: req.query.limit
      }
    }, 15000);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications by status:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error fetching notifications by status' 
    });
  }
});

// Get notifications by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'getNotificationsByUser',
      payload: { 
        userId: req.params.userId,
        page: req.query.page,
        limit: req.query.limit
      }
    }, 15000);
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error fetching user notifications' 
    });
  }
});

// Mark notification as read
router.patch('/:id/markAsRead', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'markAsRead',
      payload: { 
        notificationId: req.params.id
      }
    }, 15000);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error marking notification as read' 
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('notification-request', {
      action: 'deleteNotification',
      payload: { 
        notificationId: req.params.id
      }
    }, 15000);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting notification:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error deleting notification' 
    });
  }
});

module.exports = router;