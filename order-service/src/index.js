require("dotenv").config();
const express = require('express');
const { initKafkaProducer, initKafkaConsumer } = require('./services/kafkaService');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Order Service is healthy');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke in the Order Service!');
});

// Start server and initialize MongoDB and Kafka
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');
    await initKafkaProducer();
    console.log('Kafka Producer initialized');
    await initKafkaConsumer();
    console.log('Kafka Consumer initialized');
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Order Service:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();