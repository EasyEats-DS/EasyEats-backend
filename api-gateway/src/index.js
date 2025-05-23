require("dotenv").config();
const express = require("express");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const deliveryRoutes = require("./routes/deliveryRoutes");


const restaurantRoutes = require("./routes/resturantRoutes");
const authRoutes = require("./routes/authRoutes");
const { initKafkaProducer, initKafkaConsumer } = require("./services/kafkaService");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/notifications", notificationRoutes);

app.use("/deliveries", deliveryRoutes);


// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send('API Gateway is healthy');
});
app.use("/restaurants", restaurantRoutes);
app.use('/auth',authRoutes)


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

