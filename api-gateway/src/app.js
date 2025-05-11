const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Root endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.send('Connected to API Gateway');
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint accessed');
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/users', userRoutes);
app.use('/orders', orderRoutes);
app.use('/payments', paymentRoutes);
app.use("/notifications", notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something broke in the API Gateway!' });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.url);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});

module.exports = app;