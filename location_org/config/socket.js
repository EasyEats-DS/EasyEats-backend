const { socketAuth } = require('./socketAuth');

module.exports = (server) => {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Resolves the signed-in user before any handler runs, so a socket's identity
  // is never whatever the client claimed it was.
  io.use(socketAuth);

  return io;
};
