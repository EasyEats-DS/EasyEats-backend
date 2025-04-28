const { consumeOrderPlaced } = require('../kafka/consumer');
const { getSocketMaps } = require('./socketService');

exports.startKafkaConsumer = (io) => {
  const { connectedDrivers } = getSocketMaps();
  consumeOrderPlaced(io, connectedDrivers);
};