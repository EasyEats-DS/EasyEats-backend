'use strict';

/**
 * Decision logic for sequential dispatch.
 *
 * Deliberately free of Mongo, sockets and timers: an offer loop that hands one
 * order to one driver at a time is all edge cases -- exhausted candidates,
 * drivers who go offline mid-offer, two drivers racing on the same order -- and
 * those are only cheap to exercise while the rules are plain functions.
 */

const OFFER_TIMEOUT_MS = Number(process.env.OFFER_TIMEOUT_MS) || 30_000;
const ROUND_PAUSE_MS = Number(process.env.DISPATCH_ROUND_PAUSE_MS) || 60_000;
const MAX_ROUNDS = Number(process.env.DISPATCH_MAX_ROUNDS) || 5;

/** A driver who declined is never asked again; a timeout is not a refusal. */
const isRefusal = (rejection) => rejection?.reason === 'declined';

/**
 * Driver ids that must never receive this order again.
 *
 * Someone who tapped Decline has answered. Someone who simply let the countdown
 * run out, or whose phone dropped off the network, has not -- they stay in the
 * pool for later rounds, which is the whole point of retrying in waves.
 */
function permanentlyExcluded(rejections = []) {
  return rejections.filter(isRefusal).map((rejection) => rejection.driverId);
}

/**
 * The next driver to offer to, scanning forward from `fromIndex`.
 *
 * Ineligible drivers are skipped here rather than offered to and left to time
 * out: a driver who is offline or already on a delivery would otherwise burn a
 * full 30-second window each, stalling the order behind drivers who were never
 * going to answer.
 */
function selectNextCandidate({
  candidates = [],
  fromIndex = 0,
  isEligible = () => true,
  excluded = [],
}) {
  const blocked = new Set(excluded);

  for (let index = Math.max(0, fromIndex); index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate || !candidate.driverId) continue;
    if (blocked.has(candidate.driverId)) continue;
    if (!isEligible(candidate.driverId)) continue;
    return { candidate, index };
  }

  return null;
}

/** Whether the candidate list may be rebuilt and walked again. */
function shouldStartNewRound({ round, maxRounds = MAX_ROUNDS }) {
  return round + 1 < maxRounds;
}

/** Absolute expiry for an offer made at `now`. */
function offerExpiry(now = new Date(), timeoutMs = OFFER_TIMEOUT_MS) {
  return new Date(now.getTime() + timeoutMs);
}

/**
 * Whether `driverId` may still claim this order.
 *
 * This mirrors the filter of the atomic findOneAndUpdate that actually performs
 * the claim -- it is here so the reason for a refusal can be reported to the
 * driver, not to decide the race. Mongo decides the race.
 */
function acceptRejectionReason(assignment, { driverId, offerToken, now = new Date() }) {
  if (!assignment) return 'not_found';
  if (assignment.state === 'accepted' || assignment.driverId) return 'already_taken';
  if (assignment.state !== 'offered' || !assignment.currentOffer) return 'no_longer_offered';
  if (String(assignment.currentOffer.driverId) !== String(driverId)) return 'offered_to_another_driver';
  if (assignment.currentOffer.offerToken !== offerToken) return 'stale_offer';
  if (new Date(assignment.currentOffer.expiresAt) <= now) return 'expired';
  return null;
}

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance in metres between two GeoJSON [lng, lat] pairs.
 *
 * Used for the distance shown to the driver. Ordering of candidates comes from
 * Mongo's $near, which already sorts nearest-first.
 */
function distanceMeters(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) return null;
  const [lng1, lat1] = from.map(Number);
  const [lng2, lat2] = to.map(Number);
  if ([lng1, lat1, lng2, lat2].some(Number.isNaN)) return null;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Turns user documents from the nearby-drivers lookup into candidate entries,
 * preserving the nearest-first order Mongo returned and dropping duplicates.
 */
function toCandidates(drivers = [], origin = null) {
  const seen = new Set();
  const candidates = [];

  for (const driver of drivers) {
    const driverId = driver?._id && String(driver._id);
    if (!driverId || seen.has(driverId)) continue;
    seen.add(driverId);

    candidates.push({
      driverId,
      distance: origin ? distanceMeters(origin, driver?.position?.coordinates) : null,
    });
  }

  return candidates;
}

/**
 * Appends drivers who are connected right now but whom the geo query missed.
 *
 * The geo query reads stored positions, which are only as fresh as the last
 * location a driver's browser managed to report -- a driver sitting in the app
 * with geolocation switched off keeps whatever position they had days ago. That
 * stale value must not be able to hide a driver who is demonstrably online,
 * because the alternative is an order failing while someone was available.
 *
 * They go last and carry no distance: proximity still wins when it is known.
 */
function withConnectedFallback(candidates = [], connectedDriverIds = []) {
  const known = new Set(candidates.map((candidate) => String(candidate.driverId)));

  const fallback = [];
  for (const id of connectedDriverIds) {
    const driverId = String(id);
    if (!driverId || known.has(driverId)) continue;
    known.add(driverId);
    fallback.push({ driverId, distance: null, fallback: true });
  }

  return [...candidates, ...fallback];
}

/**
 * The assignment state that mirrors a given delivery status.
 *
 * Two vocabularies reach this: the schema's own (`picked_up`, `delivered`) and
 * the older one some clients still send (`in_progress`, `completed`). Both are
 * accepted, because a status that fails to map leaves the assignment open and
 * its driver permanently counted as busy.
 *
 * Returns null for anything unrecognised rather than guessing a state.
 */
const ASSIGNMENT_STATE_BY_DELIVERY_STATUS = {
  assigned: 'accepted',
  picked_up: 'picked_up',
  in_progress: 'picked_up',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
};

function assignmentStateForDeliveryStatus(status) {
  return ASSIGNMENT_STATE_BY_DELIVERY_STATUS[status] || null;
}

/**
 * Where this order is actually going.
 *
 * The chosen drop-off wins when the customer picked one at checkout. Otherwise
 * it falls back to the customer's stored position, which is only as good as the
 * last location their browser reported -- fine as a fallback, wrong as a
 * default, and the reason orders used to be routed to wherever the customer
 * last opened the app.
 */
function resolveDropoff(snapshot) {
  const chosen = snapshot?.deliveryLocation?.coordinates;
  if (Array.isArray(chosen) && chosen.length === 2 && chosen.every((v) => Number.isFinite(Number(v)))) {
    return { coordinates: chosen.map(Number), source: 'chosen' };
  }

  const stored = snapshot?.customer?.position?.coordinates;
  if (Array.isArray(stored) && stored.length === 2 && stored.every((v) => Number.isFinite(Number(v)))) {
    return { coordinates: stored.map(Number), source: 'customer-position' };
  }

  return { coordinates: null, source: 'none' };
}

/** Delivery statuses that mean the driver is free to take another order. */
const TERMINAL_DELIVERY_STATUSES = ['delivered', 'completed', 'cancelled'];

module.exports = {
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
  assignmentStateForDeliveryStatus,
  TERMINAL_DELIVERY_STATUSES,
  resolveDropoff,
};
