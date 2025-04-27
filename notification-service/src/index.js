require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const { initKafkaProducer, initKafkaConsumer } = require("./services/kafkaService");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(express.json());

// Routes
app.use("/notifications", notificationRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke in the Notification Service!');
});

// Startup function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("MongoDB connected successfully");
    
    // Initialize Kafka
    await initKafkaProducer();
    console.log("Kafka Producer initialized");
    await initKafkaConsumer();
    console.log("Kafka Consumer initialized");
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Notification Service:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();