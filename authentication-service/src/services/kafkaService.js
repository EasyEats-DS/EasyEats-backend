const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
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
        if (action === 'login') {
          authController = require('../controller/authController');
          response = await authController.login(payload);
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