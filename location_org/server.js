const http = require('http');
const app = require('./app');
const configureSocket = require('./config/socket');
//const { initializeSampleRestaurants } = require('./controllers/restaurantController');
const OrderConsumer = require('./kafka/consumer');
const socketController = require('./controllers/socketController');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Socket.io setup
const io = configureSocket(server);
socketController(io);

// Initialize data and start server
server.listen(PORT, async () => {
  try {
    //await initializeSampleRestaurants();
    console.log(`Server running on port ${PORT}`);
    
    // Start Kafka consumer
    await OrderConsumer.initialize(io);
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
});

// // Handle graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received. Shutting down gracefully...');
//   server.close(() => {
//     console.log('Server closed');
//     process.exit(0);
//   });
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received. Shutting down gracefully...');
//   server.close(() => {
//     console.log('Server closed');
//     process.exit(0);
//   });
// });