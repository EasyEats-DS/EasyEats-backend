const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

// Import controllers at the module level
let orderController;

const initKafkaProducer = async () => {
  await producer.connect();
};

const initKafkaConsumer = async () => {
  // Avoid circular dependency by requiring controller here
  orderController = require('../controllers/orderController');
  
  await consumer.connect();
  
  // Subscribe to request topics and inter-service communication
  await consumer.subscribe({ 
    topics: ['order-request', 'user-validation'], 
    fromBeginning: false 
  });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = JSON.parse(message.value.toString());
      console.log(`Received message from topic ${topic}:`, messageValue);
      
      if (topic === 'order-request') {
        // Handle API gateway requests
        try {
          const { action, payload, correlationId } = messageValue;
          
          let responseData;
          let success = true;
          let statusCode = 200;
          
          switch (action) {
            case 'createOrder':
              responseData = await orderController.createOrder(payload);
              statusCode = 201;
              break;
            case 'getOrder':
              responseData = await orderController.getOrderById(payload.id);
              break;
            case 'updateOrderStatus':
              responseData = await orderController.updateOrderStatus(payload.id, payload.status);
              break;
            default:
              success = false;
              responseData = { message: `Unknown action: ${action}` };
              statusCode = 400;
          }
          
          // Send response back to API gateway
          await producer.send({
            topic: 'order-response',
            messages: [
              { 
                value: JSON.stringify({
                  correlationId,
                  success,
                  statusCode,
                  data: responseData,
                  timestamp: new Date().toISOString()
                })
              }
            ]
          });
        } catch (error) {
          console.error('Error processing order request:', error);
          
          // Send error response
          await producer.send({
            topic: 'order-response',
            messages: [
              { 
                value: JSON.stringify({
                  correlationId: messageValue.correlationId,
                  success: false,
                  statusCode: 500,
                  message: error.message,
                  timestamp: new Date().toISOString()
                })
              }
            ]
          });
        }
      } else if (topic === 'user-validation') {
        // Process user validation response
        const { orderId, userId, isValid } = messageValue;
        
        if (isValid) {
          // Update order status to processing
          await orderController.updateOrderStatus(orderId, 'processing');
          
          // Send notification about the order status change
          await producer.send({
            topic: 'order-status',
            messages: [
              { 
                value: JSON.stringify({
                  orderId,
                  userId,
                  status: 'processing',
                  timestamp: new Date().toISOString()
                })
              }
            ]
          });
        }
      }
    }
  });
};

const produceMessage = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
    console.log(`Message sent to topic ${topic}`);
    return true;
  } catch (error) {
    console.error(`Error producing message to ${topic}:`, error);
    return false;
  }
};

module.exports = {
  initKafkaProducer,
  initKafkaConsumer,
  produceMessage
};