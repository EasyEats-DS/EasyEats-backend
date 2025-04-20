const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

// Initialize Kafka client
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 10
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'api-gateway-group' });
const pendingRequests = new Map();

// Connect Kafka producer
const initKafkaProducer = async () => {
  await producer.connect();
};

// Connect Kafka consumer and subscribe to response topics
const initKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['user-response', 'order-response'], fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const response = JSON.parse(message.value.toString());
      console.log(`Received response on topic ${topic}:`, response);
      const { correlationId } = response;
      // Handle response for matching correlationId
      if (pendingRequests.has(correlationId)) {
        const { resolve, reject, timer } = pendingRequests.get(correlationId);
        clearTimeout(timer);
        if (response.success) {
          resolve(response.data);
        } else {
          const error = new Error(response.message || 'Service error');
          error.statusCode = response.statusCode || 500;
          reject(error);
        }
        pendingRequests.delete(correlationId);
      }
    }
  });
};

// Send message to Kafka and wait for response
const sendMessageWithResponse = async (topic, message, timeoutMs = 5000) => {
  const correlationId = uuidv4();
  const messageWithCorrelation = {
    ...message,
    correlationId,
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(correlationId);
      reject(new Error('Request timed out'));
    }, timeoutMs);

    pendingRequests.set(correlationId, { resolve, reject, timer });

    producer.send({
      topic,
      messages: [{ value: JSON.stringify(messageWithCorrelation) }]
    }).catch(error => {
      clearTimeout(timer);
      pendingRequests.delete(correlationId);
      reject(error);
    });
  });
};

module.exports = {
  initKafkaProducer,
  initKafkaConsumer,
  sendMessageWithResponse
};