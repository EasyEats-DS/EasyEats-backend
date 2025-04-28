const { Kafka } = require('kafkajs');
const { 
  sendOrderConfirmation, 
  sendDeliveryUpdate, 
  getNotificationHistory,
  getNotificationsByStatus,
  getNotificationsByUser,
  deleteNotification
} = require('../controllers/notificationController');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const initKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'notification-request' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(message.value.toString());
          console.log(`Received message from topic ${topic}:`, parsedMessage);
          
          const { action, payload, correlationId } = parsedMessage;
          if (!action || !correlationId) {
            throw new Error('Invalid message format: missing action or correlationId');
          }

          let responseData;
          let success = true;
          let statusCode = 200;

          switch (action) {
            case 'sendOrderConfirmation':
              responseData = await sendOrderConfirmation(payload);
              break;
            case 'sendDeliveryUpdate':
              responseData = await sendDeliveryUpdate(payload);
              break;
            case 'getNotificationHistory':
              responseData = await getNotificationHistory(payload.orderId);
              break;
            case 'getNotificationsByStatus':
              responseData = await getNotificationsByStatus(payload);
              break;
            case 'getNotificationsByUser':
              responseData = await getNotificationsByUser(payload);
              break;
            case 'deleteNotification':
              responseData = await deleteNotification(payload.notificationId);
              break;
            default:
              success = false;
              statusCode = 400;
              responseData = { message: `Unknown action: ${action}` };
          }

          await producer.send({
            topic: 'notification-response',
            messages: [{
              value: JSON.stringify({
                correlationId,
                success,
                statusCode,
                data: responseData,
                timestamp: new Date().toISOString()
              })
            }]
          });
        } catch (error) {
          console.error('Error processing notification request:', error);
          await producer.send({
            topic: 'notification-response',
            messages: [{
              value: JSON.stringify({
                correlationId: parsedMessage?.correlationId,
                success: false,
                statusCode: error.statusCode || 500,
                message: error.message || 'Internal server error',
                timestamp: new Date().toISOString()
              })
            }]
          });
        }
      },
    });

    console.log('Kafka consumer initialized for notification service');
  } catch (error) {
    console.error('Error initializing Kafka consumer:', error);
    throw error;
  }
};

const initKafkaProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected successfully');
  } catch (error) {
    console.error('Error connecting Kafka producer:', error);
    throw error;
  }
};

module.exports = {
  initKafkaProducer,
  initKafkaConsumer
};