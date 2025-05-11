const { Kafka } = require('kafkajs');

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'location-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
    });
    this.consumer = this.kafka.consumer({ groupId: 'driver-group' });
    this.producer = this.kafka.producer();
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.producer.connect();
      console.log('Connected to Kafka (consumer and producer)');
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async subscribe(topic) {
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  async consumeMessages(handler) {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            let data = JSON.parse(message.value.toString());
            data.topic = topic;
            //console.log(`Received message from ${topic} [${partition}]`);
            await handler(data);
          } catch (parseError) {
            console.error('Error processing message:', parseError);
          }
        },
      });
    } catch (error) {
      console.error('Error in message consumption:', error);
      throw error;
    }
  }

  async produceMessage(topic, payload,correlationId) {
    //console.log('Producing message to topic:', topic ,'payload',payload, 'correlationId',correlationId);
    let success = true;
    let statusCode = 200;
     
    try {
      await this.producer.send({
        topic,
        messages: [ { 
          value: JSON.stringify({
            correlationId,
            success,
            statusCode,
            data: payload,
            timestamp: new Date().toISOString()
          })
        }],
      });
      console.log(`Produced message to topic: ${topic}`);
    } catch (error) {
      console.error('Error producing message:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect(); // <-- Disconnect producer too!
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
    }
  }
}

module.exports = KafkaService;
