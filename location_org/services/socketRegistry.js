'use strict';

/**
 * Who is connected, and on which socket.
 *
 * This lived inside socketService, but the dispatcher needs it too -- and
 * socketService needs the dispatcher to handle accept/reject. Holding the maps
 * in their own module keeps that from becoming a require cycle.
 */

const connectedDrivers = new Map(); // socketId => driverId
const driverSocketMap = new Map(); // driverId => socketId
const customerSocketMap = new Map(); // customerId => socketId
const driverToCustomerMap = new Map(); // driverId => customerId

/**
 * Points a role's id at its current socket, dropping any earlier one.
 *
 * A driver who reloads the page arrives on a new socket while the old one is
 * still in the map; offers sent to the stale socket would vanish, so the
 * previous connection is closed rather than left to linger.
 */
function register({ role, id, socket }) {
  if (!role || !id || !socket) return null;

  const key = String(id);
  const map = role === 'driver' ? driverSocketMap : customerSocketMap;
  const previousSocketId = map.get(key);

  if (previousSocketId && previousSocketId !== socket.id) {
    const previousSocket = socket.server?.sockets?.sockets?.get(previousSocketId);
    if (previousSocket) previousSocket.disconnect(true);
  }

  map.set(key, socket.id);
  if (role === 'driver') connectedDrivers.set(socket.id, key);

  return key;
}

/** Forgets a socket, returning the driver id it belonged to, if any. */
function unregister(socketId) {
  const driverId = connectedDrivers.get(socketId);

  if (driverId) {
    connectedDrivers.delete(socketId);
    if (driverSocketMap.get(driverId) === socketId) driverSocketMap.delete(driverId);
    driverToCustomerMap.delete(driverId);
  }

  for (const [customerId, id] of customerSocketMap.entries()) {
    if (id === socketId) customerSocketMap.delete(customerId);
  }

  return driverId || null;
}

const driverSocketId = (driverId) => driverSocketMap.get(String(driverId)) || null;
const customerSocketId = (customerId) => customerSocketMap.get(String(customerId)) || null;
const isDriverOnline = (driverId) => driverSocketMap.has(String(driverId));

/** Every driver holding a live socket, in the order they connected. */
const connectedDriverIds = () => [...driverSocketMap.keys()];

/** Emits to a driver if they are connected; reports whether it landed. */
function emitToDriver(io, driverId, event, payload) {
  const socketId = driverSocketId(driverId);
  if (!socketId) return false;

  io.to(socketId).emit(event, payload);
  return true;
}

/** Emits to a customer if they are connected; reports whether it landed. */
function emitToCustomer(io, customerId, event, payload) {
  const socketId = customerSocketId(customerId);
  if (!socketId) return false;

  io.to(socketId).emit(event, payload);
  return true;
}

module.exports = {
  register,
  unregister,
  driverSocketId,
  customerSocketId,
  isDriverOnline,
  connectedDriverIds,
  emitToDriver,
  emitToCustomer,
  getSocketMaps: () => ({
    connectedDrivers,
    driverSocketMap,
    customerSocketMap,
    driverToCustomerMap,
  }),
};
