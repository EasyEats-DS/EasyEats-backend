require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
// const restaurantRoutes = require('./routes/restaurantRoutes');
// const authRoutes = require('./routes/authR');
const deliveryRoutes = require('./routes/DeliveryRoutes');
const googleRoutes = require('./routes/googleRoute');

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDB();

// Routes
// app.use('/api/restaurants', restaurantRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/delivery', deliveryRoutes);
// app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;