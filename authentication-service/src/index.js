// authentication-service/index.js or app.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db'); // Make sure path is correct
const { initKafka } = require('./services/kafkaService');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Auth Service is healthy');
});

const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    console.log("MongoDB connected successfully");
    
    // Then initialize Kafka
    await initKafka();
    console.log("Kafka initialized successfully");
    
    // Finally start the server
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Auth Service:", error);
    process.exit(1);
  }
};

startServer();