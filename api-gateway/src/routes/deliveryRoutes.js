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

/**
 * What a delivery's status means for the customer's order.
 *
 * Both delivery vocabularies are mapped: the schema's own (`picked_up`,
 * `delivered`) and the older one earlier clients sent (`in_progress`,
 * `completed`). An unmapped status used to leave `orderStatus` undefined, which
 * the order service then rejected as an invalid status -- turning "Start
 * Delivery" into a 500 even though the delivery itself had updated fine.
 */
const ORDER_STATUS_BY_DELIVERY_STATUS = {
  assigned: 'processing',
  picked_up: 'shipped',
  in_progress: 'shipped',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
};

router.patch('/:deliveryId/status', async (req, res) => {
  console.log("update delivery status________________________",req.body, req.params.deliveryId);

  const orderStatus = ORDER_STATUS_BY_DELIVERY_STATUS[req.body.status];

  try {
    const deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'updateStatus',
      payload: {status: req.body.status,
        deliveryId: req.params.deliveryId
      },
      replyTo: 'delivery-response'
    });

    // The delivery is the source of truth here; mirroring it onto the order is
    // a convenience. If that mirror fails, the driver still gets a success --
    // otherwise a bookkeeping error would look like the delivery not starting.
    if (orderStatus && deliveryResult?.orderId) {
      try {
        await sendMessageWithResponse("order-request", {
          action: "updateOrderStatus",
          payload: { orderId: deliveryResult.orderId, status: orderStatus },
        });
      } catch (orderError) {
        console.error('Delivery updated but order status did not follow:', orderError.message);
      }
    } else if (!orderStatus) {
      console.warn(`No order status mapped for delivery status "${req.body.status}"`);
    }

    console.log("deliveryResult________________________",deliveryResult);
    return res.status(200).json(deliveryResult);
  } catch (error) {
    console.error('Error updating delivery status:', error.message);
    return res.status(500).json({
      message: error.message || 'Error updating delivery status'
    });
  }


  try {
    const result = await sendMessageWithResponse("order-request", {
      action: "updateOrderStatus",
      payload: { orderId: req.params.id, status: req.body.status },
      correlationId: req.headers["x-correlation-id"] || Date.now().toString(),
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
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
  const customerId = req.params.id;
  const token = req.headers['authorization'];

  console.log("customer id________", customerId);
  console.log("token________", token);

  try {
    let deliveryResult = await sendMessageWithResponse('delivery-request', {
      action: 'getDeliveriesByCusId',
      replyTo: 'delivery-response',
      payload: { customerId, token }
    });

    deliveryResult = deliveryResult.flat();
    console.log("deliveryResult________", deliveryResult);

    const updatedDeliveries = await Promise.all(deliveryResult.map(async (order) => {

      const restaurantResult = await sendMessageWithResponse('restaurant-request', {
        action: 'getRestaurant',
        replyTo: 'restaurant-response',
        payload: { id: order.restaurantId }
      });

      const customerResult = await sendMessageWithResponse('user-request', {
        action: 'getUser',
        replyTo: 'user-response',
        payload: { userId: order.customerId }
      });

      const driverResult = await sendMessageWithResponse('user-request', {
        action: 'getUser',
        replyTo: 'user-response',
        payload: { userId: order.driverId }
      });

      return {
        ...order,
        restaurantId: restaurantResult,
        customerId: customerResult.user,
        driverId: driverResult.user
      };
    }));

    console.log("enrichedDeliveries________", updatedDeliveries);

    
    return res.json(updatedDeliveries);
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
  let deliveryResult = await sendMessageWithResponse('delivery-request', {
    action: 'getDeliveriesByDriver',
    replyTo: 'delivery-response',
    payload: data
  });

  deliveryResult = deliveryResult.flat();

  console.log("deliveryResult________",deliveryResult);

  const updatedDeliveries = await Promise.all(deliveryResult.map(async (order) => {

    const restaurantResult = await sendMessageWithResponse('restaurant-request', {
      action: 'getRestaurant',
      replyTo: 'restaurant-response',
      payload: { id: order.restaurantId }
    });

    const customerResult = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      replyTo: 'user-response',
      payload: { userId: order.customerId }
    });

    const driverResult = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      replyTo: 'user-response',
      payload: { userId: order.driverId }
    });

    return {
      ...order,
      restaurantId: restaurantResult,
      customerId: customerResult.user,
      driverId: driverResult.user
    };
  }));

  console.log("enrichedDeliveries________", updatedDeliveries);
  return res.json(updatedDeliveries);
} catch (error) {
  console.error('Error fetching deliveries:', error.message);
  return res.status(500).json({ 
    message: error.message || 'Error fetching deliveries' 
  });
}
});

module.exports = router;