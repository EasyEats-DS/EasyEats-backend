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
  console.log('Kafka producer initialized');
};

const initKafkaConsumer = async () => {
  await consumer.connect();
  console.log('Kafka consumer connected');
  
  // Subscribe to response topics from other services
  await consumer.subscribe({ 
    topics: ['user-response', 'order-response', 'restaurant-response', 'auth-responses'], 
    fromBeginning: false 
  });
  console.log('Subscribed to response topics');
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const responseStr = message.value.toString();
        console.log(`Received raw message on topic ${topic}:`, responseStr);
        
        const response = JSON.parse(responseStr);
        console.log(`Parsed response:`, response);
        
        // Check if we have a pending request with this correlationId
        const { correlationId } = response;
        
        if (pendingRequests.has(correlationId)) {
          console.log(`Found pending request for correlationId: ${correlationId}`);
          const { resolve, reject, timer } = pendingRequests.get(correlationId);
          
          // Clear timeout
          clearTimeout(timer);
          
          // Handle auth-responses topic differently
          if (topic === 'auth-responses') {
            console.log(`Handling auth-responses topic response for correlationId: ${correlationId}`);
            if (response.status === 'success' && response.data) {
              console.log(`Resolving with auth data for correlationId: ${correlationId}`);
              resolve(response.data);
            } else {
              console.log(`Rejecting with auth error for correlationId: ${correlationId}`);
              const error = new Error(response.message || 'Authentication error');
              error.statusCode = response.statusCode || 500;
              reject(error);
            }
          } 
          // Handle user-response and other topics
          else {
            console.log(`Handling ${topic} topic response for correlationId: ${correlationId}`);
            if (response.success === true || response.status === 'success') {
              console.log(`Resolving with success data for correlationId: ${correlationId}`);
              const responseData = response.data || (response.success ? response : null);
              resolve(responseData);
            } else {
              console.log(`Rejecting with error for correlationId: ${correlationId}`);
              const error = new Error(response.message || 'Service error');
              error.statusCode = response.statusCode || 500;
              reject(error);
            }
          }
          
          // Remove from pending requests
          pendingRequests.delete(correlationId);
          console.log(`Removed pending request for correlationId: ${correlationId}`);
        } else {
          console.log(`No pending request found for correlationId: ${correlationId}`);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });
  console.log('Kafka consumer is running');
};

const sendMessageWithResponse = async (topic, message, timeoutMs = 30000) => {
  const correlationId = message.correlationId || uuidv4();
  console.log(`Preparing message for topic ${topic} with correlationId ${correlationId}`);
  
  // Create a promise that will be resolved when we get a response
  const responsePromise = new Promise((resolve, reject) => {
    // Set a timeout to reject the promise if we don't get a response
    const timer = setTimeout(() => {
      if (pendingRequests.has(correlationId)) {
        pendingRequests.delete(correlationId);
        console.log(`Request to ${topic} timed out after ${timeoutMs}ms for correlationId ${correlationId}`);
        reject(new Error(`Request to ${topic} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    
    // Store the callbacks to resolve/reject the promise later
    pendingRequests.set(correlationId, { resolve, reject, timer });
    console.log(`Added pending request with correlationId: ${correlationId}`);
  });
  
  // Determine the expected response topic
  let responseTopic;
  if (topic === 'auth-requests') {
    responseTopic = 'auth-responses';
  } else if (topic === 'user-request') {
    responseTopic = 'user-response';
  } else {
    responseTopic = `${topic.split('-')[0]}-response`;
  }
  console.log(`Will expect response on topic: ${responseTopic}`);
  
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