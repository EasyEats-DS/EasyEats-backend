const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('Connecting to MongoDB...',process.env.MONGO_URI);
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodDelivery', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;