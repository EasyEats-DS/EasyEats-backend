const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Basic routes that map to controller functions
router.get('/user/:userId', notificationController.getNotificationsByUserId);
router.get('/history/:orderId', notificationController.getNotificationHistory);
router.get('/status/:status', notificationController.getNotificationsByStatus);
router.post('/order-confirmation', notificationController.sendOrderConfirmation);
router.post('/delivery-update', notificationController.sendDeliveryUpdate);
router.patch('/:notificationId/markAsRead', notificationController.markNotificationAsRead);
router.patch('/user/:userId/read-all', notificationController.markAllNotificationsAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;