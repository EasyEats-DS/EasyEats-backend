require("dotenv").config();
const express = require('express');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const { initKafkaProducer, initKafkaConsumer } = require('./services/kafkaService');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(express.json());

app.use('/orders', orderRoutes);
app.use('/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('API Gateway is healthy');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke in the API Gateway!');
});

// Start server and initialize Kafka
const startServer = async () => {
  try {
    await initKafkaProducer();
    console.log('Kafka Producer initialized');
    await initKafkaConsumer();
    console.log('Kafka Consumer initialized');
    app.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();