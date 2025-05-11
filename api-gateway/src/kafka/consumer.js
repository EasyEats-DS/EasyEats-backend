const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'api-gateway-group' });

const responseHandlers = new Map();

const initConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ 
    topics: ['user-response', 'order-response', 'payment-response'],
    fromBeginning: false 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const response = JSON.parse(message.value.toString());
      const { correlationId, success, statusCode, data, message: responseMessage } = response;
      
      const responseHandler = responseHandlers.get(correlationId);
      if (responseHandler) {
        const { res } = responseHandler;
        if (success) {
          res.status(statusCode).json(data);
        } else {
          res.status(statusCode).json({ error: responseMessage });
        }
        responseHandlers.delete(correlationId);
      }
    },
  });
};

module.exports = {
  initConsumer,
  responseHandlers
};