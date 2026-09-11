const axios = require('axios');

const { getMapData } = require('../utils/maps');
const registry = require('./socketRegistry');
const dispatch = require('./dispatchService');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:5003';

const handleConnection = async (socket) => {
  console.log('New socket connection:', socket.id);
  try {
    const mapData = await getMapData();
    socket.emit('map:init', mapData);
  } catch (error) {
    console.error('Error initializing map data:', error);
  }
};

/**
 * Binds this socket to the signed-in user.
 *
 * The id comes from the verified token rather than the payload the client sent;
 * the payload is now only a hint about which role the page is acting as.
 */
const handleIdentification = (socket) => {
  const user = socket.data?.user;

  if (!user?.id || !user.role) {
    console.warn(`[socket] ${socket.id} tried to identify without a valid token`);
    socket.emit('identify:result', { ok: false, reason: 'unauthenticated' });
    return null;
  }

  registry.register({ role: user.role, id: user.id, socket });
  console.log(`[socket] ${user.role} ${user.id} on socket ${socket.id}`);

  socket.emit('identify:result', { ok: true, role: user.role, id: user.id });
  return user;
};

/**
 * Rejoins whichever order this user is already party to.
 *
 * A driver who refreshes mid-delivery, or a customer who reopens the app, would
 * otherwise stay out of the tracking room until the next assignment.
 */
const restoreTracking = async (socket) => {
  const user = socket.data?.user;
  if (!user?.id) return;

  const assignment =
    user.role === 'driver'
      ? await dispatch.activeAssignmentForDriver(user.id)
      : await dispatch.activeAssignmentForCustomer(user.id);

  if (!assignment) return;

  socket.join(dispatch.trackingRoom(assignment.orderId));
  socket.emit('delivery:restored', {
    orderId: assignment.orderId,
    state: assignment.state,
    driverId: assignment.driverId,
    deliveryId: assignment.deliveryId,
    snapshot: assignment.snapshot,
  });
};

const handleAcceptOffer = async (io, socket, { assignmentId, offerToken }) => {
  const user = socket.data?.user;
  if (user?.role !== 'driver') return;

  try {
    await dispatch.handleAccept(io, { driverId: user.id, assignmentId, offerToken });
  } catch (error) {
    console.error('Error accepting offer:', error);
    socket.emit('delivery:offer_result', { ok: false, assignmentId, reason: 'server_error' });
  }
};

const handleRejectOffer = async (io, socket, { assignmentId, offerToken }) => {
  const user = socket.data?.user;
  if (user?.role !== 'driver') return;

  try {
    await dispatch.handleReject(io, { driverId: user.id, assignmentId, offerToken });
  } catch (error) {
    console.error('Error rejecting offer:', error);
  }
};

const handleSubscribeTracking = async (io, socket, { orderId }) => {
  const user = socket.data?.user;
  if (!user?.id) return;

  try {
    const result = await dispatch.subscribeToTracking(io, socket, { orderId, userId: user.id });
    socket.emit('tracking:subscribed', { orderId, ...result });
  } catch (error) {
    console.error('Error subscribing to tracking:', error);
  }
};

const handleOrderStatusUpdate = async (io, { orderId }) => {
  // The delivery document itself arrives here under the name `orderId`.
  const delivery = orderId;
  if (!delivery?.orderId) return;

  try {
    await dispatch.updateDeliveryState(io, {
      orderId: delivery.orderId,
      status: delivery.deliveryStatus,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
  }
};

/**
 * Persists a position and fans it out.
 *
 * Two audiences, deliberately separate: every connected client gets the coarse
 * `location_updated` that moves map markers, while only the customer waiting on
 * this specific driver gets `delivery:driver_location`.
 */
const handleLiveLocation = async (io, socket, { location }) => {
  const user = socket.data?.user;
  if (!user?.id || !location) return;

  const { latitude, longitude } = location;
  if (latitude === undefined || longitude === undefined) return;

  // GeoJSON order, matching how positions are stored and queried.
  const coordinates = [Number(longitude), Number(latitude)];

  try {
    await axios.post(`${GATEWAY_URL}/users/updateLocation`, {
      location,
      customerId: user.id,
    });
  } catch (error) {
    console.error('Error persisting location:', error.message);
  }

  io.emit('location_updated', {
    userId: user.id,
    role: user.rawRole,
    location: coordinates,
  });

  if (user.role === 'driver') {
    try {
      await dispatch.relayDriverLocation(io, user.id, coordinates);
    } catch (error) {
      console.error('Error relaying driver location:', error);
    }
  }
};

const handleDisconnect = async (io, socket) => {
  const driverId = registry.unregister(socket.id);

  if (driverId) {
    try {
      await dispatch.handleDriverDisconnect(io, driverId);
    } catch (error) {
      console.error('Error handling driver disconnect:', error);
    }
  }
};

module.exports = {
  handleConnection,
  handleIdentification,
  restoreTracking,
  handleAcceptOffer,
  handleRejectOffer,
  handleSubscribeTracking,
  handleLiveLocation,
  handleOrderStatusUpdate,
  handleDisconnect,
  getSocketMaps: registry.getSocketMaps,
};
