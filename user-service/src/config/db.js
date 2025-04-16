const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;
  console.log("MONGO_URI:", mongoURI);
  
  if (!mongoURI) {
    console.error("MONGO_URI is not defined!");
    throw new Error("MongoDB connection string is missing");
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true
    });
    console.log("Service connected to MongoDB");
    // console.log("Connected to database:", mongoose.connection.db.databaseName); 
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;