const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  console.log("Attempting to connect to MongoDB at:", mongoURI);
  
  if (!mongoURI) {
    console.error("MONGO_URI is not defined in environment variables!");
    throw new Error("MongoDB connection string is missing");
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    // Add debug logging
    mongoose.set('debug', true);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    mongoose.connection.on('connected', () => {
      console.log("MongoDB connected successfully");
      console.log("Connected to database:", mongoose.connection.db.databaseName);
    });

    mongoose.connection.on('error', (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("MongoDB disconnected");
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

module.exports = connectDB;