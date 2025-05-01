const {
    handleConnection,
    handleIdentification,
    handleAcceptOrder,
    handleLiveLocation,
    handleOrderStatusUpdate,
    handleDisconnect
    
  } = require('../services/socketService');
  
  module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      handleConnection(socket);
      
      socket.on('identify', (data) => handleIdentification(socket, data));
      socket.on('accept_order', (data) => handleAcceptOrder(io, socket, data));
      socket.on('live_location', (data) => handleLiveLocation(io, data));
      socket.on('status_update', (data) => {
        console.log("Backend received status_update event:", data);
        handleOrderStatusUpdate(io, data);
      });
      socket.onAny((event, data) => {
        console.log(`Received event: ${event}`, data);
      });
            socket.on('disconnect', () => handleDisconnect(socket));
    });
  };