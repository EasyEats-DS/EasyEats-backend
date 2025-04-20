const { Kafka } = require('kafkajs');

// Initialize Kafka client
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 10
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

let orderController;

// Connect Kafka producer
const initKafkaProducer = async () => {
  await producer.connect();
};

// Connect Kafka consumer and subscribe to request topics
const initKafkaConsumer = async () => {
  orderController = require('../controllers/orderController');
  await consumer.connect();
  await consumer.subscribe({
    topics: ['order-request', 'user-validation'],
    fromBeginning: false
  });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = JSON.parse(message.value.toString());
      console.log(`Received message from topic ${topic}:`, messageValue);
      if (topic === 'order-request') {
        try {
          const { action, payload, correlationId } = messageValue;
          let responseData;
          let success = true;
          let statusCode = 200;
          // Handle different API actions
          switch (action) {
            case 'createOrder':
              responseData = await orderController.createOrder(payload);
              statusCode = 201;
              break;
            case 'getOrder':
              responseData = await orderController.getOrderById(payload.id);
              break;
            case 'getAllOrders':
              responseData = await orderController.getAllOrders(payload);
              break;
            case 'updateOrderStatus':
              responseData = await orderController.updateOrderStatus(payload.id, payload.status);
              break;
            default:
              success = false;
              responseData = { message: `Unknown action: ${action}` };
              statusCode = 400;
          }
          // Send response to API Gateway
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
          console.log(`Message sent to topic order-response`);
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
                  statusCode: error.statusCode || 500,
                  message: error.message || 'Error processing order request',
                  details: error.details,
                  timestamp: new Date().toISOString()
                })
              }
            ]
          });
        }
      } else if (topic === 'user-validation') {
        // Handle user validation response
        const { orderId, userId, isValid } = messageValue;
        if (isValid) {
          await orderController.updateOrderStatus(orderId, 'processing');
          // Notify User Service of status update
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

// Send message to Kafka topic
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