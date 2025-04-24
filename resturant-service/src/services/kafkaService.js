const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'restaurant-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'restaurant-service-group' });

let restaurantController;

const initKafkaProducer = async () => {
  await producer.connect();
};

const initKafkaConsumer = async () => {
  restaurantController = require('../controllers/resturantController');
  
  await consumer.connect();
  
  await consumer.subscribe({ 
    topics: ['restaurant-request', 'owner-validation'], 
    fromBeginning: false 
  });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = JSON.parse(message.value.toString());
      console.log(`Received message from topic ${topic}:`, messageValue);
      
      if (topic === 'restaurant-request') {
        try {
          const { action, payload, correlationId } = messageValue;
          
          let responseData;
          let success = true;
          let statusCode = 200;
          
          switch (action) {
            case 'createRestaurant':
              responseData = await restaurantController.createRestaurant(payload);
              statusCode = 201;
              break;
            case 'getRestaurant':
              responseData = await restaurantController.getRestaurantById(payload.id);
              break;
            case 'updateRestaurant':
              responseData = await restaurantController.updateRestaurant(payload.id, payload.updateData);
              break;
            case 'getRestaurantsByOwner':
              responseData = await restaurantController.getRestaurantsByOwner(payload.ownerId);
              break;
            case 'addMenuItem':
              responseData = await restaurantController.addMenuItem(payload.restaurantId, payload.menuItem);
              statusCode = 201;
              break;
            case 'updateMenuItem':
              responseData = await restaurantController.updateMenuItem(
                payload.restaurantId, 
                payload.menuItemId, 
                payload.updateData
              );
              break;
            case 'deleteRestaurant':
              responseData = await restaurantController.deleteRestaurantById(payload.id);
              break;
            default:
              success = false;
              responseData = { message: `Unknown action: ${action}` };
              statusCode = 400;
          }
          
          await producer.send({
            topic: 'restaurant-response',
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
          console.error('Error processing restaurant request:', error);
          
          await producer.send({
            topic: 'restaurant-response',
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
      } else if (topic === 'owner-validation') {
        const { restaurantId, userId, isValid } = messageValue;
        
        if (!isValid) {
          await restaurantController.updateRestaurant(restaurantId, { isActive: false });
          
          await producer.send({
            topic: 'restaurant-status',
            messages: [
              { 
                value: JSON.stringify({
                  restaurantId,
                  userId,
                  status: 'inactive',
                  reason: 'Owner validation failed',
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