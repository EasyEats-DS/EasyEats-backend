const express = require('express');
const router = express.Router();

const {getDeliveryById, getDeliveryByDriverId,updateDeliveryStatus,getDeliveryByCustomerId} = require('../controllers/delivery');

router.get('/:deliveryId',getDeliveryById);
router.get('/driver/:driverId',getDeliveryByDriverId);
router.get('/customer/:customerId',getDeliveryByCustomerId);
router.patch('/:deliveryId/status',updateDeliveryStatus );

module.exports = router;