const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'auth-service-group' });

let authController;

const initKafka = async () => {
  await producer.connect();
  await consumer.connect();
  
  await consumer.subscribe({ 
    topics: ['auth-requests'],
    fromBeginning: false 
  });

  consumer.run({
    eachMessage: async ({ topic, message }) => {
      const { correlationId, action, payload } = JSON.parse(message.value.toString());
      
      try {
        let response;
        authController = require('../controller/authController');
        if (action === 'login') {
          response = await authController.login(payload);
        } else if (action === 'logout') {
          response = await authController.logout(payload);
        } else {
          // Previously an unknown action fell through and was answered with
          // "success" and an undefined body, which reads as a working call.
          throw new Error(`Unknown auth action: ${action}`);
        }

        await producer.send({
          topic: 'auth-responses',
          messages: [{
            value: JSON.stringify({
              correlationId,
              status: 'success',
              data: response
            })
          }]
        });
      } catch (error) {
        await producer.send({
          topic: 'auth-responses',
          messages: [{
            value: JSON.stringify({
              correlationId,
              status: 'error',
              message: error.message
            })
          }]
        });
      }
    }
  });
};

module.exports = { initKafka, producer };