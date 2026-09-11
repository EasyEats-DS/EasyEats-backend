const {
  handleConnection,
  handleIdentification,
  restoreTracking,
  handleAcceptOffer,
  handleRejectOffer,
  handleSubscribeTracking,
  handleLiveLocation,
  handleOrderStatusUpdate,
  handleDisconnect,
} = require('../services/socketService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    handleConnection(socket);

    socket.on('identify', async () => {
      const user = handleIdentification(socket);
      // A driver reconnecting mid-delivery rejoins their order's room here.
      if (user) await restoreTracking(socket);
    });

    socket.on('delivery:accept', (data) => handleAcceptOffer(io, socket, data || {}));
    socket.on('delivery:reject', (data) => handleRejectOffer(io, socket, data || {}));
    socket.on('tracking:subscribe', (data) => handleSubscribeTracking(io, socket, data || {}));

    socket.on('live_location', (data) => handleLiveLocation(io, socket, data || {}));
    socket.on('status_update', (data) => handleOrderStatusUpdate(io, data || {}));

    socket.on('disconnect', () => handleDisconnect(io, socket));
  });
};
