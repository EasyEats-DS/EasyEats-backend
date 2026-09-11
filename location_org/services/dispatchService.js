'use strict';

const crypto = require('crypto');
const axios = require('axios');

const DeliveryAssignment = require('../models/DeliveryAssignment');
const { createDelivery } = require('../controllers/delivery');
const registry = require('./socketRegistry');
const {
  OFFER_TIMEOUT_MS,
  ROUND_PAUSE_MS,
  MAX_ROUNDS,
  permanentlyExcluded,
  selectNextCandidate,
  shouldStartNewRound,
  offerExpiry,
  acceptRejectionReason,
  distanceMeters,
  toCandidates,
  withConnectedFallback,
} = require('./dispatchRules');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:5003';

/**
 * Pending offer countdowns and round pauses, by assignment id.
 *
 * In-process on purpose: the authoritative state is the document, and the boot
 * sweep re-arms whatever these were tracking. Losing a timer delays an order,
 * it never loses one.
 */
const timers = new Map();

const clearTimer = (assignmentId) => {
  const handle = timers.get(String(assignmentId));
  if (handle) {
    clearTimeout(handle);
    timers.delete(String(assignmentId));
  }
};

const setTimer = (assignmentId, ms, fn) => {
  clearTimer(assignmentId);
  timers.set(String(assignmentId), setTimeout(fn, ms));
};

/** The socket.io room carrying one order's live tracking. */
const trackingRoom = (orderId) => `order:${orderId}`;

// --------------------------------------------------------------------------
// Candidate sourcing
// --------------------------------------------------------------------------

/**
 * Drivers already committed to another delivery.
 *
 * Without this, the nearest driver keeps winning every order in the area and is
 * offered a second one while still carrying the first.
 */
async function busyDriverIds() {
  const busy = await DeliveryAssignment.find({
    state: { $in: ['accepted', 'picked_up'] },
    driverId: { $ne: null },
  })
    .select('driverId')
    .lean();

  return new Set(busy.map((assignment) => String(assignment.driverId)));
}

/**
 * Nearest-first drivers around the pickup point.
 *
 * Returns an empty list rather than throwing: a dispatch with no candidates is
 * an ordinary outcome that the round logic already handles, and an exception
 * here would abandon the order entirely.
 */
async function fetchNearbyDrivers(coordinates) {
  try {
    const { data } = await axios.post(`${GATEWAY_URL}/users/nearby`, {
      location: coordinates,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[dispatch] nearby driver lookup failed:', error.message);
    return [];
  }
}

const pickupCoordinates = (assignment) =>
  assignment?.snapshot?.restaurant?.position?.coordinates || null;

const dropoffCoordinates = (assignment) =>
  assignment?.snapshot?.customer?.position?.coordinates || null;

/** Rebuilds the candidate list for a fresh round. */
async function buildCandidates(assignment) {
  const origin = pickupCoordinates(assignment);
  if (!origin) {
    console.warn(`[dispatch] order ${assignment.orderId} has no restaurant position`);
    return [];
  }

  const drivers = await fetchNearbyDrivers(origin);
  const nearby = toCandidates(drivers, origin);

  // A connected driver whose stored position is stale would otherwise be
  // invisible to dispatch while sitting in the app waiting for work.
  const candidates = withConnectedFallback(nearby, registry.connectedDriverIds());

  console.log(
    `[dispatch] order ${assignment.orderId}: ${nearby.length} nearby, ` +
      `${candidates.length - nearby.length} connected-but-not-nearby, ` +
      `${registry.connectedDriverIds().length} driver(s) online`,
  );

  return candidates;
}

// --------------------------------------------------------------------------
// Customer-facing notifications
// --------------------------------------------------------------------------

function notifyCustomer(io, assignment, event, payload) {
  registry.emitToCustomer(io, assignment.customerId, event, {
    orderId: assignment.orderId,
    ...payload,
  });
}

// --------------------------------------------------------------------------
// The offer loop
// --------------------------------------------------------------------------

/**
 * Offers the order to the next eligible driver, or ends the round.
 *
 * Every path out of an offer -- accepted, declined, timed out, driver vanished
 * -- comes back here, so this is the single place that decides who is asked
 * next.
 */
async function offerNext(io, assignmentId) {
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment) return;
  if (!['searching', 'offered'].includes(assignment.state)) return;

  const busy = await busyDriverIds();
  const excluded = permanentlyExcluded(assignment.rejections);

  const next = selectNextCandidate({
    candidates: assignment.candidates,
    fromIndex: assignment.currentIndex,
    excluded,
    isEligible: (driverId) => registry.isDriverOnline(driverId) && !busy.has(driverId),
  });

  if (!next) {
    await endOfRound(io, assignment);
    return;
  }

  const offerToken = crypto.randomUUID();
  const expiresAt = offerExpiry(new Date(), OFFER_TIMEOUT_MS);

  const offered = await DeliveryAssignment.findOneAndUpdate(
    { _id: assignment._id, state: { $in: ['searching', 'offered'] }, driverId: null },
    {
      $set: {
        state: 'offered',
        currentIndex: next.index,
        currentOffer: { driverId: next.candidate.driverId, offerToken, expiresAt },
      },
    },
    { new: true },
  );

  // Claimed between the read and the write -- the winner's handler owns it now.
  if (!offered) return;

  const delivered = registry.emitToDriver(io, next.candidate.driverId, 'delivery:offer', {
    assignmentId: String(offered._id),
    orderId: offered.orderId,
    offerToken,
    expiresAt,
    timeoutMs: OFFER_TIMEOUT_MS,
    order: offered.snapshot,
    pickup: {
      name: offered.snapshot?.restaurant?.name,
      coordinates: pickupCoordinates(offered),
    },
    dropoff: { coordinates: dropoffCoordinates(offered) },
    distanceMeters: next.candidate.distance,
    totalAmount: offered.snapshot?.totalAmount,
    paymentMethod: offered.snapshot?.paymentMethod,
  });

  // They dropped off between the eligibility check and the emit.
  if (!delivered) {
    await recordRejection(io, offered, next.candidate.driverId, offerToken, 'disconnected');
    return;
  }

  notifyCustomer(io, offered, 'delivery:searching', {
    round: offered.round + 1,
    attempt: next.index + 1,
    candidateCount: offered.candidates.length,
    expiresAt,
  });

  setTimer(offered._id, OFFER_TIMEOUT_MS + 500, () => {
    handleOfferTimeout(io, offered._id, offerToken).catch((error) =>
      console.error('[dispatch] offer timeout failed:', error),
    );
  });
}

/**
 * Moves past a driver who did not take the order.
 *
 * The update is conditional on the offer token so that a countdown firing at
 * the same moment the driver taps Accept cannot advance an order that has
 * already been claimed.
 */
async function recordRejection(io, assignment, driverId, offerToken, reason) {
  clearTimer(assignment._id);

  const advanced = await DeliveryAssignment.findOneAndUpdate(
    {
      _id: assignment._id,
      state: 'offered',
      'currentOffer.offerToken': offerToken,
    },
    {
      $set: {
        state: 'searching',
        currentIndex: (assignment.currentIndex ?? 0) + 1,
        currentOffer: { driverId: null, offerToken: null, expiresAt: null },
      },
      $push: {
        rejections: { driverId: String(driverId), reason, round: assignment.round, at: new Date() },
      },
    },
    { new: true },
  );

  if (!advanced) return null;

  // A silent timeout is not worth telling the customer about; an explicit
  // refusal is, because it explains why the search is still going.
  if (reason === 'declined') {
    notifyCustomer(io, advanced, 'delivery:driver_rejected', {
      round: advanced.round + 1,
      attempt: advanced.currentIndex,
    });
  }

  await offerNext(io, advanced._id);
  return advanced;
}

/**
 * The candidate list is spent. Either wait and sweep again, or give up.
 */
async function endOfRound(io, assignment) {
  clearTimer(assignment._id);

  if (!shouldStartNewRound({ round: assignment.round, maxRounds: MAX_ROUNDS })) {
    const failed = await DeliveryAssignment.findOneAndUpdate(
      { _id: assignment._id, driverId: null },
      {
        $set: {
          state: 'failed',
          failureReason: 'no_driver_available',
          currentOffer: { driverId: null, offerToken: null, expiresAt: null },
        },
      },
      { new: true },
    );

    if (failed) {
      console.warn(`[dispatch] order ${failed.orderId} found no driver after ${MAX_ROUNDS} rounds`);
      notifyCustomer(io, failed, 'delivery:search_failed', { reason: 'no_driver_available' });
    }
    return;
  }

  const nextRound = await DeliveryAssignment.findOneAndUpdate(
    { _id: assignment._id, driverId: null },
    {
      $set: {
        state: 'searching',
        currentIndex: 0,
        currentOffer: { driverId: null, offerToken: null, expiresAt: null },
      },
      $inc: { round: 1 },
    },
    { new: true },
  );

  if (!nextRound) return;

  notifyCustomer(io, nextRound, 'delivery:searching', {
    round: nextRound.round + 1,
    attempt: 0,
    retrying: true,
    retryInMs: ROUND_PAUSE_MS,
  });

  setTimer(nextRound._id, ROUND_PAUSE_MS, () => {
    startRound(io, nextRound._id).catch((error) =>
      console.error('[dispatch] round restart failed:', error),
    );
  });
}

/** Rebuilds candidates and walks the list from the top. */
async function startRound(io, assignmentId) {
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment || assignment.state !== 'searching' || assignment.driverId) return;

  const candidates = await buildCandidates(assignment);

  const refreshed = await DeliveryAssignment.findOneAndUpdate(
    { _id: assignment._id, driverId: null },
    { $set: { candidates, currentIndex: 0 } },
    { new: true },
  );

  if (!refreshed) return;
  await offerNext(io, refreshed._id);
}

// --------------------------------------------------------------------------
// Entry points
// --------------------------------------------------------------------------

/**
 * Begins the search for a driver. Called from the order_placed consumer.
 *
 * Idempotent on orderId: Kafka redelivery of the same order must not start a
 * second search competing with the first.
 */
async function startDispatch(io, enrichedOrder) {
  const orderId = String(enrichedOrder._id || enrichedOrder.orderId);
  const customerId = String(enrichedOrder.customer?._id || enrichedOrder.userId);

  if (!orderId || !customerId) {
    console.error('[dispatch] order is missing an id or a customer, ignoring');
    return null;
  }

  const existing = await DeliveryAssignment.findOne({ orderId });
  if (existing) {
    console.log(`[dispatch] order ${orderId} already has an assignment (${existing.state})`);
    return existing;
  }

  const assignment = await DeliveryAssignment.create({
    orderId,
    customerId,
    restaurantId: String(enrichedOrder.restaurantId || enrichedOrder.restaurant?._id),
    state: 'searching',
    snapshot: enrichedOrder,
  });

  console.log(`[dispatch] searching for a driver for order ${orderId}`);
  notifyCustomer(io, assignment, 'delivery:searching', { round: 1, attempt: 0 });

  await startRound(io, assignment._id);
  return assignment;
}

/**
 * A driver claims the order.
 *
 * The conditional update is the only thing standing between two drivers and the
 * same delivery -- it is a single-document atomic operation, so exactly one
 * caller can observe a non-null result even across service instances.
 */
async function handleAccept(io, { driverId, assignmentId, offerToken }) {
  const claimed = await DeliveryAssignment.findOneAndUpdate(
    {
      _id: assignmentId,
      state: 'offered',
      driverId: null,
      'currentOffer.driverId': String(driverId),
      'currentOffer.offerToken': offerToken,
      'currentOffer.expiresAt': { $gt: new Date() },
    },
    {
      $set: {
        state: 'accepted',
        driverId: String(driverId),
        currentOffer: { driverId: null, offerToken: null, expiresAt: null },
      },
    },
    { new: true },
  );

  if (!claimed) {
    const assignment = await DeliveryAssignment.findById(assignmentId);
    const reason =
      acceptRejectionReason(assignment, { driverId, offerToken }) || 'no_longer_offered';

    registry.emitToDriver(io, driverId, 'delivery:offer_result', {
      ok: false,
      assignmentId,
      reason,
    });
    return null;
  }

  clearTimer(claimed._id);

  const pickup = pickupCoordinates(claimed) || [];
  const dropoff = dropoffCoordinates(claimed) || [];

  const delivery = await createDelivery({
    orderId: claimed.orderId,
    driverId: claimed.driverId,
    customerId: claimed.customerId,
    restaurantId: claimed.restaurantId,
    pickupLocation: { lng: pickup[0], lat: pickup[1], address: claimed.snapshot?.restaurant?.name },
    dropoffLocation: { lng: dropoff[0], lat: dropoff[1] },
    products: claimed.snapshot?.products,
    paymentMethod: claimed.snapshot?.paymentMethod,
    totalPrice: claimed.snapshot?.totalAmount,
  });

  if (delivery?._id) {
    claimed.deliveryId = String(delivery._id);
    await claimed.save();
  }

  const driverSocketId = registry.driverSocketId(driverId);
  const customerSocketId = registry.customerSocketId(claimed.customerId);
  const room = trackingRoom(claimed.orderId);

  // Both sides join the order's room so location updates stop being a broadcast.
  io.sockets.sockets.get(driverSocketId)?.join(room);
  io.sockets.sockets.get(customerSocketId)?.join(room);

  const driverProfile = await fetchDriverProfile(driverId);

  registry.emitToDriver(io, driverId, 'delivery:offer_result', {
    ok: true,
    assignmentId: String(claimed._id),
    orderId: claimed.orderId,
    delivery,
    customer: claimed.snapshot?.customer,
    pickup: { coordinates: pickup },
    dropoff: { coordinates: dropoff },
  });

  notifyCustomer(io, claimed, 'delivery:assigned', {
    deliveryId: claimed.deliveryId,
    driver: driverProfile,
    pickup: { coordinates: pickup },
    dropoff: { coordinates: dropoff },
  });

  console.log(`[dispatch] order ${claimed.orderId} accepted by driver ${driverId}`);
  return claimed;
}

/** A driver taps Decline. */
async function handleReject(io, { driverId, assignmentId, offerToken }) {
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment) return null;

  registry.emitToDriver(io, driverId, 'delivery:offer_cancelled', {
    assignmentId,
    reason: 'declined',
  });

  return recordRejection(io, assignment, driverId, offerToken, 'declined');
}

/** The countdown ran out with no answer. */
async function handleOfferTimeout(io, assignmentId, offerToken) {
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment || assignment.state !== 'offered') return null;
  if (assignment.currentOffer?.offerToken !== offerToken) return null;

  const driverId = assignment.currentOffer.driverId;

  registry.emitToDriver(io, driverId, 'delivery:offer_cancelled', {
    assignmentId: String(assignmentId),
    reason: 'expired',
  });

  return recordRejection(io, assignment, driverId, offerToken, 'timeout');
}

/**
 * A driver's socket dropped.
 *
 * If they were holding an open offer, moving on immediately is better than
 * letting the order wait out a countdown nobody is watching.
 */
async function handleDriverDisconnect(io, driverId) {
  if (!driverId) return;

  const assignment = await DeliveryAssignment.findOne({
    state: 'offered',
    'currentOffer.driverId': String(driverId),
  });

  if (!assignment) return;

  await recordRejection(
    io,
    assignment,
    driverId,
    assignment.currentOffer.offerToken,
    'disconnected',
  );
}

// --------------------------------------------------------------------------
// Tracking
// --------------------------------------------------------------------------

/** The assignment a driver is currently delivering, if any. */
function activeAssignmentForDriver(driverId) {
  return DeliveryAssignment.findOne({
    driverId: String(driverId),
    state: { $in: ['accepted', 'picked_up'] },
  });
}

/** The assignment a customer is currently waiting on, if any. */
function activeAssignmentForCustomer(customerId) {
  return DeliveryAssignment.findOne({
    customerId: String(customerId),
    state: { $in: ['searching', 'offered', 'accepted', 'picked_up'] },
  }).sort({ createdAt: -1 });
}

/**
 * Relays a driver's position to the customer waiting on them.
 *
 * Scoped to the order's room rather than broadcast, so a customer sees the
 * driver bringing *their* food and not every driver on the platform.
 */
async function relayDriverLocation(io, driverId, coordinates) {
  const assignment = await activeAssignmentForDriver(driverId);
  if (!assignment) return null;

  io.to(trackingRoom(assignment.orderId)).emit('delivery:driver_location', {
    orderId: assignment.orderId,
    driverId: String(driverId),
    coordinates,
    at: new Date(),
  });

  return assignment;
}

/**
 * Lets a reconnecting customer rejoin their order's room.
 *
 * Authorised against the assignment's own customerId: the order id travels to
 * the browser, so without this check anyone holding one could subscribe to a
 * stranger's driver location.
 */
async function subscribeToTracking(io, socket, { orderId, userId }) {
  const assignment = await DeliveryAssignment.findOne({ orderId: String(orderId) });
  if (!assignment) return { ok: false, reason: 'not_found' };

  const isParticipant =
    String(assignment.customerId) === String(userId) ||
    (assignment.driverId && String(assignment.driverId) === String(userId));

  if (!isParticipant) return { ok: false, reason: 'forbidden' };

  socket.join(trackingRoom(assignment.orderId));
  return { ok: true, state: assignment.state, driverId: assignment.driverId };
}

/**
 * Advances a delivery that is already assigned, and closes the room when it
 * ends so a finished order stops streaming locations.
 */
async function updateDeliveryState(io, { orderId, status }) {
  const stateByStatus = {
    picked_up: 'picked_up',
    in_progress: 'picked_up',
    delivered: 'delivered',
    completed: 'delivered',
    cancelled: 'cancelled',
  };

  const state = stateByStatus[status];
  if (!state) return null;

  const assignment = await DeliveryAssignment.findOneAndUpdate(
    { orderId: String(orderId) },
    { $set: { state } },
    { new: true },
  );

  if (!assignment) return null;

  io.to(trackingRoom(assignment.orderId)).emit('delivery:status', {
    orderId: assignment.orderId,
    status: state,
  });

  if (['delivered', 'cancelled'].includes(state)) {
    clearTimer(assignment._id);
    io.socketsLeave(trackingRoom(assignment.orderId));
  }

  return assignment;
}

async function fetchDriverProfile(driverId) {
  try {
    const { data } = await axios.get(`${GATEWAY_URL}/users/d/${driverId}`);
    const user = data?.user || data;
    return {
      _id: String(driverId),
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone,
      position: user?.position,
    };
  } catch (error) {
    console.error('[dispatch] driver profile lookup failed:', error.message);
    return { _id: String(driverId) };
  }
}

// --------------------------------------------------------------------------
// Restart recovery
// --------------------------------------------------------------------------

/**
 * Re-drives every search that was in flight when this service stopped.
 *
 * Without it a restart would leave orders frozen mid-search with no timer to
 * wake them -- the failure mode that put this state in Mongo in the first place.
 */
async function recoverInFlight(io) {
  const inFlight = await DeliveryAssignment.find({
    state: { $in: ['searching', 'offered'] },
  }).select('_id orderId state currentOffer currentIndex round');

  if (inFlight.length === 0) return 0;

  console.log(`[dispatch] recovering ${inFlight.length} in-flight assignment(s)`);

  for (const assignment of inFlight) {
    const expiresAt = assignment.currentOffer?.expiresAt;
    const remaining = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;

    if (assignment.state === 'offered' && remaining > 0) {
      // The offer is still live; let it run out its remaining time.
      setTimer(assignment._id, remaining + 500, () => {
        handleOfferTimeout(io, assignment._id, assignment.currentOffer.offerToken).catch(
          (error) => console.error('[dispatch] recovered timeout failed:', error),
        );
      });
      continue;
    }

    // Anything else -- an expired offer, or a search that never got going --
    // resumes from a fresh candidate list, since drivers have moved since.
    await DeliveryAssignment.updateOne(
      { _id: assignment._id },
      {
        $set: {
          state: 'searching',
          currentOffer: { driverId: null, offerToken: null, expiresAt: null },
        },
      },
    );
    await startRound(io, assignment._id).catch((error) =>
      console.error('[dispatch] recovery round failed:', error),
    );
  }

  return inFlight.length;
}

module.exports = {
  startDispatch,
  handleAccept,
  handleReject,
  handleOfferTimeout,
  handleDriverDisconnect,
  relayDriverLocation,
  subscribeToTracking,
  updateDeliveryState,
  activeAssignmentForDriver,
  activeAssignmentForCustomer,
  recoverInFlight,
  trackingRoom,
  distanceMeters,
};
