const {
    handleConnection,
    handleIdentification,
    handleAcceptOrder,
    handleLiveLocation,
    handleDisconnect
  } = require('../services/socketService');
  
  module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      handleConnection(socket);
      
      socket.on('identify', (data) => handleIdentification(socket, data));
      socket.on('accept_order', (data) => handleAcceptOrder(io, socket, data));
      socket.on('live_location', (data) => handleLiveLocation(io, data));
      socket.on('disconnect', () => handleDisconnect(socket));
    });
  };