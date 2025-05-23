const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'user-service-group' });

// Avoid circular dependency by declaring controller variable
let userController;

const initKafkaProducer = async () => {
  await producer.connect();
};

const initKafkaConsumer = async () => {
  // Require controller here to avoid circular dependency
  userController = require('../controllers/userController');
  
  await consumer.connect();
  
  // Subscribe to request topics and inter-service communication
  await consumer.subscribe({ 
    topics: ['user-request', 'user-order', 'order-status'], 
    fromBeginning: false 
  });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = JSON.parse(message.value.toString());
      console.log(`Received message from topic ${topic}:`, messageValue);
      
      if (topic === 'user-request') {
        // Handle API gateway requests
        try {
          const { action, payload, correlationId } = messageValue;
          
          let responseData;
          let success = true;
          let statusCode = 200;
          
          switch (action) {
            case 'updateUserLocation':
              responseData = await userController.updateLocation(payload.location, payload.customerId);
              break;
            case 'login':
              responseData = await userController.login(payload.email, payload.password);
              break;
            case 'getNearbyDrivers':
              responseData = await userController.getNearbyDrivers(payload);
              break;
            case 'createUser':
              console.log('Creating user with payload:', payload);
              responseData = await userController.createUser(payload);
              console.log('User created:', responseData);
              statusCode = 201;
              break;
            case 'getUser':
              responseData = await userController.getUserById(payload.userId);
              break;
            case 'getUsers':
              responseData = await userController.getUsers(payload);
              break;
            case 'updateUser':
              responseData = await userController.updateUserById(payload.userId, payload.userData);
              break;
            case 'deleteUser':
              responseData = await userController.deleteUserById(payload.userId);
              statusCode = 200;
              break;
            default:
              success = false;
              responseData = { message: `Unknown action: ${action}` };
              statusCode = 400;
            }
          
          // Send response back to API gateway
          await producer.send({
            topic: messageValue.replyTo || 'user-response', // <-- prioritize replyTo if available
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
          console.error('Error processing user request:', error);
          
          // Send error response
          await producer.send({
            topic: 'user-response',
            messages: [
              { 
                value: JSON.stringify({
                  correlationId: messageValue.correlationId,
                  success: false,
                  statusCode: error.statusCode || 500,
                  message: error.message,
                  timestamp: new Date().toISOString()
                })
              }
            ]
          });
        }
      } else if (topic === 'user-order') {
        // Handle user validation request
        if (messageValue.action === 'validate') {
          try {
            const user = await userController.getUserById(messageValue.userId);
            
            // Send validation result back to order service
            await producer.send({
              topic: 'user-validation',
              messages: [
                { 
                  value: JSON.stringify({
                    orderId: messageValue.orderId,
                    userId: messageValue.userId,
                    isValid: !!user,
                    timestamp: new Date().toISOString()
                  })
                }
              ]
            });
          } catch (error) {
            console.error('Error validating user:', error);
            
            // Send failure message
            await producer.send({
              topic: 'user-validation',
              messages: [
                { 
                  value: JSON.stringify({
                    orderId: messageValue.orderId,
                    userId: messageValue.userId,
                    isValid: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                  })
                }
              ]
            });
          }
        }
      } else if (topic === 'order-status') {
        // Handle order status updates
        console.log(`Order ${messageValue.orderId} status updated to ${messageValue.status} for user ${messageValue.userId}`);
        
        // Here you could implement user notifications, update user order history, etc.
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