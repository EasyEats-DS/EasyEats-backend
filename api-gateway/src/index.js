require("dotenv").config();
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const { initKafkaProducer, initKafkaConsumer } = require("./services/kafkaService");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Connected to API Gateway");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke in the API Gateway!');
});

// Start server
const startServer = async () => {
  try {
    // Initialize Kafka Producer
    await initKafkaProducer();
    console.log("Kafka Producer initialized");
    
    // Initialize Kafka Consumer to receive responses
    await initKafkaConsumer();
    console.log("Kafka Consumer initialized");
    
    app.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API Gateway:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

