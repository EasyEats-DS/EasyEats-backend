require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { initKafka } = require("./services/kafkaService");

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
console.log("Attempting to connect to MongoDB at:", mongoURI);

mongoose
  .connect(mongoURI)
  .then((conn) => {
    console.log("MongoDB Connected:", conn.connection.host);
    console.log("Database Name:", conn.connection.name);
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Routes
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/payments", paymentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke in the Payment Service!");
});

const startServer = async () => {
  try {
    // Initialize Kafka
    await initKafka();
    console.log("Kafka initialized successfully");

    app.listen(PORT, () => {
      console.log(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Payment Service:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();