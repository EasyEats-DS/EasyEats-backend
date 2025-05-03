const NotificationModel = require('../models/notificationModel');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

exports.createNotification = async (notificationData) => {
  try {
    console.log('Creating notification:', notificationData);
    const notification = new NotificationModel({
      orderId: notificationData.orderId,
      userId: notificationData.userId,
      type: notificationData.type,
      message: notificationData.message,
      channels: notificationData.channels,
      status: 'PENDING',
      metadata: {
        email: notificationData.email,
        phone: notificationData.phone,
        subject: notificationData.subject
      }
    });

    const savedNotification = await notification.save();
    console.log('Notification saved:', savedNotification);

    // Send notifications through all specified channels
    const sendPromises = [];
    if (notification.channels.includes('EMAIL') && notificationData.email) {
      sendPromises.push(
        sendEmail(notificationData.email, notificationData.subject, notificationData.message)
      );
    }
    if (notification.channels.includes('SMS') && notificationData.phone) {
      sendPromises.push(
        sendSMS(notificationData.phone, notificationData.message)
      );
    }

    await Promise.all(sendPromises);

    // Update notification status
    savedNotification.status = 'SENT';
    await savedNotification.save();

    return savedNotification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
};

exports.getNotificationsByUserId = async (userId) => {
  try {
    console.log('Fetching notifications for userId:', userId);
    const notifications = await NotificationModel.find({ userId }).sort({ createdAt: -1 });
    return notifications;
  } catch (error) {
    console.error('Error in getNotificationsByUserId:', error);
    throw error;
  }
};

exports.updateNotificationStatus = async (notificationId, status) => {
  try {
    console.log('Updating notification status:', notificationId, status);
    const notification = await NotificationModel.findByIdAndUpdate(
      notificationId,
      { status },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error in updateNotificationStatus:', error);
    throw error;
  }
};

exports.sendOrderConfirmation = async (orderData) => {
  try {
    const { preferredChannel = 'EMAIL' } = orderData;
    const channels = [];
    
    // Map customer contact fields to expected fields
    const email = orderData.customerEmail || orderData.email;
    const phone = orderData.customerPhone || orderData.phone;
    const total = orderData.totalAmount || orderData.total;

    switch (preferredChannel) {
      case 'EMAIL':
        if (!email) throw new Error('Email address is required for EMAIL channel');
        channels.push('EMAIL');
        break;
      case 'SMS':
        if (!phone) throw new Error('Phone number is required for SMS channel');
        channels.push('SMS');
        break;
      case 'BOTH':
        if (!email) throw new Error('Email address is required for BOTH channels');
        if (!phone) throw new Error('Phone number is required for BOTH channels');
        channels.push('EMAIL', 'SMS');
        break;
      default:
        throw new Error('Invalid preferredChannel. Must be EMAIL, SMS, or BOTH');
    }

    const notificationData = {
      orderId: orderData.orderId,
      userId: orderData.userId,
      type: 'ORDER_CONFIRMATION',
      message: `Your order #${orderData.orderId} has been confirmed. Total amount: $${total}`,
      channels,
      email,
      phone,
      subject: 'Order Confirmation - EasyEats'
    };

    const notification = await exports.createNotification(notificationData);
    return { success: true, notification };
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    error.statusCode = error.message.includes('required') ? 400 : 500;
    throw error;
  }
};

exports.sendDeliveryUpdate = async (deliveryData) => {
  try {
    const { preferredChannel = 'EMAIL' } = deliveryData;
    const channels = [];

    switch (preferredChannel) {
      case 'EMAIL':
        if (!deliveryData.email) throw new Error('Email address is required for EMAIL channel');
        channels.push('EMAIL');
        break;
      case 'SMS':
        if (!deliveryData.phone) throw new Error('Phone number is required for SMS channel');
        channels.push('SMS');
        break;
      case 'BOTH':
        if (!deliveryData.email) throw new Error('Email address is required for BOTH channels');
        if (!deliveryData.phone) throw new Error('Phone number is required for BOTH channels');
        channels.push('EMAIL', 'SMS');
        break;
      default:
        throw new Error('Invalid preferredChannel. Must be EMAIL, SMS, or BOTH');
    }

    const notificationData = {
      orderId: deliveryData.orderId,
      userId: deliveryData.userId,
      type: 'DELIVERY_UPDATE',
      message: `Your order #${deliveryData.orderId} status has been updated to: ${deliveryData.status}`,
      channels,
      email: deliveryData.email,
      phone: deliveryData.phone,
      subject: 'Delivery Update - EasyEats'
    };

    const notification = await exports.createNotification(notificationData);
    return { success: true, notification };
  } catch (error) {
    console.error('Error sending delivery update:', error);
    error.statusCode = error.message.includes('required') ? 400 : 500;
    throw error;
  }
};

exports.getNotificationHistory = async (orderId) => {
  try {
    const notifications = await NotificationModel.find({ orderId })
      .sort({ createdAt: -1 });
    return notifications;
  } catch (error) {
    console.error('Error fetching notification history:', error);
    error.statusCode = 500;
    throw error;
  }
};

exports.getNotificationsByStatus = async (payload) => {
  try {
    const { status, page = 1, limit = 10 } = payload;
    const skip = (page - 1) * limit;

    const notifications = await NotificationModel.find({ status })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await NotificationModel.countDocuments({ status });

    return {
      notifications,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching notifications by status:', error);
    throw error;
  }
};

exports.getNotificationsByUser = async (payload) => {
  try {
    const { userId, page = 1, limit = 10 } = payload;
    const skip = (page - 1) * limit;

    const notifications = await NotificationModel.find({ userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await NotificationModel.countDocuments({ userId });

    return {
      notifications,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('Error fetching notifications by user:', error);
    throw error;
  }
};

exports.deleteNotification = async (notificationId) => {
  try {
    const notification = await NotificationModel.findByIdAndDelete(notificationId);
    
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return { 
      success: true,
      message: 'Notification deleted successfully'
    };
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    error.statusCode = error.statusCode || 500;
    throw error;
  }
};

exports.markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await NotificationModel.findByIdAndUpdate(
      notificationId,
      { status: 'READ', readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      notification
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    error.statusCode = error.statusCode || 500;
    throw error;
  }
};

exports.markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await NotificationModel.updateMany(
      { userId, status: { $ne: 'READ' } },
      { 
        status: 'READ',
        readAt: new Date()
      }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    error.statusCode = 500;
    throw error;
  }
};