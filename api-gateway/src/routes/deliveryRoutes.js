const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

router.delete('/:deliveryId', async (req, res) => {
  console.log("delete delivery________________________",req.params.deliveryId);
  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'deleteDelivery',
      replyTo: 'delivery-response',
      payload: { deliveryId: req.params.deliveryId }
    });
    return res.status(200).json(deliveryResult);
  } catch (error) {
    console.error('Error deleting delivery:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error deleting delivery' 
    });
  }
})

router.patch('/:deliveryId/status', async (req, res) => {
  console.log("update delivery status________________________",req.body, req.params.deliveryId);

  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'updateStatus',
      payload: {status: req.body.status, // Assuming the status is sent in the request body
        deliveryId: req.params.deliveryId
      }, 
      replyTo: 'delivery-response'
    });
    
    return res.status(200).json(deliveryResult);
  } catch (error) {
    console.error('Error updating delivery status:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error updating delivery status' 
    });
  }
});

router.post('/', async (req, res) => {
  console.log("create delivery________________________",req.body);
  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'createDelivery',
      replyTo: 'delivery-response',
      payload: req.body
    });
    
    return res.status(201).json(deliveryResult);
  } catch (error) {
    console.error('Error creating delivery:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error creating delivery' 
    });
  }
});


router.get('/cus/:id', async (req, res) => {
    console.log("customer id________",req.params.id);
    console.log("token________",req.headers['authorization']);

    let data = {
      customerId: req.params.id,
      token: req.headers['authorization'] 
    }

  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'getDeliveriesByCusId',
      replyTo: 'delivery-response',
      payload: data
    });

    console.log("deliveryResult________",deliveryResult);
    
    
    return res.json(deliveryResult);
  } catch (error) {
    console.error('Error fetching deliveries:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error fetching deliveries' 
    });
  }
});

router.get('/driver/:id', async (req, res) => {
    console.log("driver id________",req.params.id);
    console.log("token________",req.headers['authorization']);
    let data = {
      driverId: req.params.id,
      token: req.headers['authorization'] 
    }
  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'getDeliveriesByDriver',
      replyTo: 'delivery-response',
      payload: data
    });

    console.log("deliveryResult________",deliveryResult);
    
    return res.json(deliveryResult);
  } catch (error) {
    console.error('Error fetching deliveries:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error fetching deliveries' 
    });
  }
});

module.exports = router;