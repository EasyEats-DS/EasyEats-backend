const KafkaService = require('../services/kafkaService');
const RestaurantService = require('../controllers/restaurantController');
const CustomerService = require('../controllers/Customer');
const dispatch = require('../services/dispatchService');
const DriverService = require('../controllers/Driver');
const axios = require('axios');
const { getDeliveryByDriverId, createDelivery, getDeliveryByCusId, updateDeliveryStatus,deleteDeliveryById } = require('../controllers/delivery');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:5003';

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
        if(action == 'deleteDelivery'){
          console.log('Deleting delivery request:', payload);
          const res = await deleteDeliveryById(payload.deliveryId);
          console.log('Delivery data________:', res);
          this.kafkaService.produceMessage('delivery-response' ,res,correlationId); // Send response back to the topic
        }
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
    console.log('Processing order placed:', orderData?._id || orderData?.orderId);
    try {
      // Enriched once, here, and then carried on the assignment: every re-offer
      // to the next driver reuses this rather than refetching the restaurant
      // and the customer.
      const enrichedOrder = await this.enrichOrderData(orderData);

      await dispatch.startDispatch(io, enrichedOrder);
    } catch (error) {
      console.error('Error processing order placed:', error);
    }
  }

  async enrichOrderData(orderData) {
    let [restaurant, customer] = await Promise.all([
      axios.get(`${GATEWAY_URL}/restaurants/${orderData.restaurantId}`),
      axios.get(`${GATEWAY_URL}/users/d/${orderData.userId}`),
    ]);

    restaurant = restaurant.data;
    customer = customer.data.user;

    return {
      ...orderData,
      restaurant,
      customer,
    };
  }
}

module.exports = new OrderConsumer();