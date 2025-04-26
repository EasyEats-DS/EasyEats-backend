const KafkaService = require('../services/kafkaService');
const RestaurantService = require('../controllers/restaurantController');
const CustomerService = require('../controllers/Customer');
const { getSocketMaps } = require('../services/socketService');

class OrderConsumer {
  constructor() {
    this.kafkaService = new KafkaService();
    this.topic = 'order_placed';
  }

  async initialize(io) {
    try {
      await this.kafkaService.connect();
      await this.kafkaService.subscribe(this.topic);
      await this.kafkaService.consumeMessages(
        this.handleOrderMessage.bind(this, io)
      );
      console.log('Order consumer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize order consumer:', error);
      process.exit(1);
    }
  }

  async handleOrderMessage(io, orderData) {
    try {
      console.log('Processing order:', orderData);
      
      // Enrich order data with related entities
      const enrichedOrder = await this.enrichOrderData(orderData);
      
      // Broadcast to connected drivers
      await this.notifyDrivers(io, enrichedOrder);
      
      console.log(`Order ${orderData.orderId} processed successfully`);
    } catch (error) {
      console.error('Error processing order:', error);
    }
  }

  async enrichOrderData(orderData) {
    const [restaurant, customer] = await Promise.all([
      RestaurantService.getRestaurantById(orderData.restaurantId),
      CustomerService.getCustomerById(orderData.customerId)
    ]);
    
    return {
      ...orderData,
      restaurant,
      customer
    };
  }

  async notifyDrivers(io, orderData) {
    try {
      const { connectedDrivers } = getSocketMaps();
      const driverSockets = Array.from(connectedDrivers.keys());
      
      if (driverSockets.length === 0) {
        console.log('No connected drivers to notify');
        return;
      }
      
      for (const socketId of driverSockets) {
        io.to(socketId).emit('new_order', orderData);
      }
      
      console.log(`Notified ${driverSockets.length} drivers about order ${orderData.orderId}`);
    } catch (error) {
      console.error('Error notifying drivers:', error);
      throw error;
    }
  }
}

module.exports = new OrderConsumer();