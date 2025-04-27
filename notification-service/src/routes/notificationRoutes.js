const express = require('express');
const router = express.Router();
const Notification = require('../models/notificationModel');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { getNotificationsByUserId } = require('../controllers/notificationController');

// Get notifications by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const notifications = await getNotificationsByUserId(req.params.userId);
        res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Error fetching user notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications',
            message: error.message
        });
    }
});

// Order confirmation endpoint
router.post('/order-confirmation', async (req, res) => {
    try {
        const { orderId, userId, customerEmail, customerPhone, orderDetails } = req.body;
        console.log('Received request body:', req.body);

        // Basic validation
        if (!orderId || !userId || (!customerEmail && !customerPhone) || !orderDetails) {
            const missingFields = [];
            if (!orderId) missingFields.push('orderId');
            if (!userId) missingFields.push('userId');
            if (!customerEmail && !customerPhone) missingFields.push('either customerEmail or customerPhone');
            if (!orderDetails) missingFields.push('orderDetails');

            return res.status(400).json({
                error: 'Missing required fields',
                missingFields
            });
        }

        const notifications = [];

        // Process email notification
        if (customerEmail) {
            const emailNotification = new Notification({
                orderId,
                userId,
                type: 'ORDER_CONFIRMATION',
                channel: 'EMAIL',
                message: `Order confirmation email for order ${orderId}`,
                metadata: new Map([
                    ['email', customerEmail],
                    ['totalAmount', orderDetails.totalAmount?.toString() || '0']
                ])
            });

            try {
                await emailService.sendEmail(
                    customerEmail,
                    'Order Confirmation',
                    { orderId, ...orderDetails }
                );
                emailNotification.status = 'SENT';
            } catch (error) {
                console.error('Email sending failed:', error);
                emailNotification.status = 'FAILED';
            }

            await emailNotification.save();
            notifications.push(emailNotification);
        }

        // Process SMS notification
        if (customerPhone) {
            const smsNotification = new Notification({
                orderId,
                userId,
                type: 'ORDER_CONFIRMATION',
                channel: 'SMS',
                message: `Order #${orderId} confirmed. Total: $${orderDetails.totalAmount}`,
                metadata: new Map([
                    ['phone', customerPhone],
                    ['totalAmount', orderDetails.totalAmount?.toString() || '0']
                ])
            });

            try {
                await smsService.sendSMS(
                    customerPhone,
                    smsNotification.message
                );
                smsNotification.status = 'SENT';
            } catch (error) {
                console.error('SMS sending failed:', error);
                smsNotification.status = 'FAILED';
            }

            await smsNotification.save();
            notifications.push(smsNotification);
        }

        res.status(200).json({
            success: true,
            notifications: notifications.map(n => ({
                id: n._id,
                channel: n.channel,
                status: n.status
            }))
        });

    } catch (error) {
        console.error('Order confirmation error:', error);
        res.status(500).json({
            error: 'Failed to process notification',
            details: error.message
        });
    }
});

// Delivery update endpoint
router.post('/delivery-update', async (req, res) => {
    try {
        const { orderId, userId, customerEmail, customerPhone, status, estimatedArrival } = req.body;
        console.log('Received delivery update request:', req.body);

        if (!orderId || !userId || !status) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'orderId, userId, and status are required'
            });
        }

        const notifications = [];

        // Handle email notification
        if (customerEmail) {
            try {
                await emailService.sendEmail(
                    customerEmail,
                    'Delivery Update',
                    { orderId, status, estimatedArrival }
                );

                const emailNotif = new Notification({
                    orderId,
                    userId,
                    type: 'DELIVERY_UPDATE',
                    channel: 'EMAIL',
                    message: `Delivery update email sent for order ${orderId}`,
                    status: 'SENT',
                    metadata: new Map([
                        ['email', customerEmail],
                        ['status', status]
                    ])
                });
                await emailNotif.save();
                notifications.push(emailNotif);
            } catch (error) {
                console.error('Email notification failed:', error);
                notifications.push({
                    channel: 'EMAIL',
                    status: 'FAILED',
                    error: error.message
                });
            }
        }

        // Handle SMS notification
        if (customerPhone) {
            try {
                const smsMessage = `Order #${orderId} ${status}. ${estimatedArrival ? `ETA: ${estimatedArrival}` : ''}`;
                await smsService.sendSMS(customerPhone, smsMessage);

                const smsNotif = new Notification({
                    orderId,
                    userId,
                    type: 'DELIVERY_UPDATE',
                    channel: 'SMS',
                    message: smsMessage,
                    status: 'SENT',
                    metadata: new Map([
                        ['phone', customerPhone],
                        ['status', status]
                    ])
                });
                await smsNotif.save();
                notifications.push(smsNotif);
            } catch (error) {
                console.error('SMS notification failed:', error);
                notifications.push({
                    channel: 'SMS',
                    status: 'FAILED',
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            notifications: notifications.map(n => ({
                id: n._id,
                channel: n.channel,
                status: n.status,
                error: n.error
            }))
        });

    } catch (error) {
        console.error('Delivery update error:', error);
        res.status(500).json({
            error: 'Failed to process delivery update',
            details: error.message
        });
    }
});

// Get notification history
router.get('/history/:orderId', async (req, res) => {
    try {
        const notifications = await Notification.find({ orderId: req.params.orderId })
            .sort('-createdAt');

        if (!notifications.length) {
            return res.status(404).json({
                error: 'No notifications found',
                orderId: req.params.orderId
            });
        }

        res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Notification history error:', error);
        res.status(500).json({
            error: 'Failed to fetch notifications',
            details: error.message
        });
    }
});

module.exports = router;