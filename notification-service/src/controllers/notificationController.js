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
      status: 'PENDING',
      metadata: {
        email: notificationData.email,
        phone: notificationData.phone,
        subject: notificationData.subject,
        sentVia: {
          email: false,
          sms: false
        }
      }
    });

    await notification.save();
    console.log('Notification saved:', notification);

    const sendPromises = [];
    let emailSent = false;
    let smsSent = false;
    
    // Always attempt email if address is provided
    if (notificationData.email) {
      try {
        await sendEmail(notificationData.email, notificationData.subject, notificationData.message);
        emailSent = true;
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }
    
    // Always attempt SMS if phone is provided
    if (notificationData.phone) {
      try {
        await sendSMS(notificationData.phone, notificationData.message);
        smsSent = true;
      } catch (error) {
        console.error('Error sending SMS:', error);
      }
    }

    // Update notification status
    notification.metadata.sentVia.email = emailSent;
    notification.metadata.sentVia.sms = smsSent;
    
    if (emailSent || smsSent) {
      notification.status = 'SENT';
    } else {
      notification.status = 'FAILED';
    }
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
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
    // Map customer contact fields to expected fields
    const email = orderData.customerEmail || orderData.email;
    const phone = orderData.customerPhone || orderData.phone;
    const total = orderData.totalAmount || orderData.total;

    // Validate contact information
    if (!email && !phone) {
      throw new Error('At least one contact method (email or phone) is required for notifications');
    }

    const notificationData = {
      orderId: orderData.orderId,
      userId: orderData.userId,
      type: 'ORDER_CONFIRMATION',
      message: `Your order #${orderData.orderId} has been confirmed. Total amount: $${total}`,
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
    // Validate contact information
    if (!deliveryData.email && !deliveryData.phone) {
      throw new Error('At least one contact method (email or phone) is required for notifications');
    }

    const notificationData = {
      orderId: deliveryData.orderId,
      userId: deliveryData.userId,
      type: 'DELIVERY_UPDATE',
      message: `Your order #${deliveryData.orderId} status has been updated to: ${deliveryData.status}`,
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