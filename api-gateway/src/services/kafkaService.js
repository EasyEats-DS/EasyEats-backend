const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'api-gateway-group' });

// Store for pending requests
const pendingRequests = new Map();

const initKafkaProducer = async () => {
  await producer.connect();
};

const initKafkaConsumer = async () => {
  await consumer.connect();
  
  // Subscribe to response topics from other services
  await consumer.subscribe({ topics: ['user-response', 'order-response'], fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const response = JSON.parse(message.value.toString());
      console.log(`Received response on topic ${topic}:`, response);
      
      // Check if we have a pending request with this correlationId
      const { correlationId } = response;
      if (pendingRequests.has(correlationId)) {
        const { resolve, reject, timer } = pendingRequests.get(correlationId);
        
        // Clear timeout
        clearTimeout(timer);
        
        // Handle response based on success flag
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.message || 'Service error'));
        }
        
        // Remove from pending requests
        pendingRequests.delete(correlationId);
      }
    }
  });
};

const sendMessageWithResponse = async (topic, message, timeoutMs = 5000) => {
  const correlationId = uuidv4();
  
  // Create a promise that will be resolved when we get a response
  const responsePromise = new Promise((resolve, reject) => {
    // Set a timeout to reject the promise if we don't get a response
    const timer = setTimeout(() => {
      if (pendingRequests.has(correlationId)) {
        pendingRequests.delete(correlationId);
        reject(new Error(`Request to ${topic} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    
    // Store the callbacks to resolve/reject the promise later
    pendingRequests.set(correlationId, { resolve, reject, timer });
  });
  
  // Send the message
  await producer.send({
    topic,
    messages: [
      { 
        value: JSON.stringify({
          ...message,
          correlationId,
          timestamp: new Date().toISOString()
        })
      }
    ]
  });
  
  console.log(`Message sent to topic ${topic} with correlationId ${correlationId}`);
  
  // Return the promise that will be resolved when we get a response
  return responsePromise;
};

module.exports = {
  initKafkaProducer,
  initKafkaConsumer,
  sendMessageWithResponse
};