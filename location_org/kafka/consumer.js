const KafkaService = require('../services/kafkaService');
const RestaurantService = require('../controllers/restaurantController');
const CustomerService = require('../controllers/Customer');
const { getSocketMaps } = require('../services/socketService');
const DriverService = require('../controllers/Driver');
const axios = require('axios');
const { getDeliveryByDriverId, createDelivery, getDeliveryByCusId, updateDeliveryStatus } = require('../controllers/delivery');

class OrderConsumer {
  constructor() {
    this.kafkaService = new KafkaService();
    this.topics = ['order_placed','delivery-request'];
  }

  async initialize(io) {
    try {
      await this.kafkaService.connect();
      // Subscribe to multiple topics
      for (const topic of this.topics) {
        console.log(`Subscribing to topic: ${topic}`);
        await this.kafkaService.subscribe(topic);
      }

      // Consume messages from both topics
      await this.kafkaService.consumeMessages(
        this.handleOrderMessage.bind(this, io)
      );
      console.log('Order consumer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize order consumer:', error);
      process.exit(1);
    }
  }

  async handleOrderMessage(io, message) {
    const { action ,topic, payload,correlationId } = message;  // Get topic and message value
    console.log('Received message:', message);

    try {
      if (topic === 'order_placed') {
        console.log('Processing order placed:', payload);
        await this.processOrderPlaced(io, payload);
        this.kafkaService.produceMessage('order-response', payload, correlationId); // Send response back to the topic
      } else if (topic === 'delivery-request') {
        if(action == 'createDelivery'){

          console.log('creating delivery request:', payload);
          const res = await createDelivery(payload);
          console.log('Delivery data________:', res);
          const topic = message.replyTo || 'delivery-response';
          this.kafkaService.produceMessage(topic ,res,correlationId);
        }
        else if(action == 'getDeliveriesByCusId'){
          console.log('Fetching deliveries by customer ID:', payload);
          console.log('Fetching deliveries by customer ID____:', payload.customerId);
          const res = await getDeliveryByCusId(payload.customerId,payload.token);
          //console.log('Delivery data for customer:', res);
          const topic = payload.replyTo || 'delivery-response';
          this.kafkaService.produceMessage(topic ,res,correlationId); // Send response back to the topic
        }
        else if(action == 'updateStatus'){
          console.log('Updating delivery status:', payload);
          const res = await updateDeliveryStatus(payload.deliveryId,payload.status);
          console.log('Delivery data for driver:', res);
          const topic = payload.replyTo || 'delivery-response';
          console.log('11111111111:', res);
          this.kafkaService.produceMessage(topic ,res,correlationId); // Send response back to the topic
        }
        else{

        
        console.log('Processing delivery request:', payload);
        await this.processDeliveryRequest(io, message); // Handle delivery update
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  async processDeliveryRequest(io, deliveryData) {
    console.log('Processing delivery request:', deliveryData);
    const correlationId = deliveryData.correlationId;
    const res = await getDeliveryByDriverId(deliveryData.payload.driverId,deliveryData.payload.token);
    console.log('Delivery data for driver:', res);
    const topic = deliveryData.replyTo || 'delivery-response';
    this.kafkaService.produceMessage(topic ,res,correlationId); // Send response back to the topic
}


  async processOrderPlaced(io, orderData) {
    console.log('Processing order placed______:', orderData);
    try {
      // Enrich order data with related entities
      const enrichedOrder = await this.enrichOrderData(orderData);
      console.log('Enriched order data for placed order:', enrichedOrder);
      
      // Notify drivers about the new order
      await this.notifyDrivers(io, enrichedOrder);

    } catch (error) {
      console.error('Error processing order placed:', error);
    }
  }

  async enrichOrderData(orderData) {
    let [restaurant, customer] = await Promise.all(
            
      [
        await axios.get(`http://localhost:5003/restaurants/${orderData.restaurantId}`),
           await axios.get(`http://localhost:5003/users/${orderData.userId}`)
      //RestaurantService.getRestaurantById(orderData.restaurantId),
      //CustomerService.getCustomerById(orderData.customerId)
    ]);
     restaurant = restaurant.data;
     customer = customer.data.user;
    return {
      ...orderData,
      restaurant,
      customer
    };
  }

  async notifyDrivers(io, orderData) {
    try {
      const { driverSocketMap } = getSocketMaps(); // Use driverSocketMap for id => socketId
      //const nearD = await DriverService.getNearbyDrivers(orderData.restaurant.position);
      let nearD = await axios.post(`http://localhost:5003/users/nearby`, {
        
        location: orderData.restaurant.position.coordinates
        
      });
      //nearD = nearD.data;
      console.log('Nearby drivers______:', nearD.data);
      const notifiedSockets = [];
  
      for (const driver of nearD.data) {
        const driverId = driver._id.toString();
        const socketId = driverSocketMap.get(driverId);
        
        if (!socketId) {
          console.log(`Nearby driver ${driverId} is not connected`);
          continue;
        }
  
        // Emit to the connected and nearby driver
        io.to(socketId).emit('new_order', orderData);
        notifiedSockets.push(socketId);
        console.log(`Notified driver ${driverId} via socket ${socketId}`);
      }
  
      if (notifiedSockets.length === 0) {
        console.log('No nearby connected drivers to notify');
      } else {
        console.log(`Notified ${notifiedSockets.length} nearby drivers about order ${orderData.orderId}`);
      }
  
    } catch (error) {
      console.error('Error notifying drivers:', error);
      throw error;
    }
  }
}

module.exports = new OrderConsumer();