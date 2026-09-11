'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  permanentlyExcluded,
  selectNextCandidate,
  shouldStartNewRound,
  offerExpiry,
  acceptRejectionReason,
  distanceMeters,
  toCandidates,
  withConnectedFallback,
} = require('./dispatchRules');

const candidates = [
  { driverId: 'a' },
  { driverId: 'b' },
  { driverId: 'c' },
];

test('a driver who declined is excluded, a driver who timed out is not', () => {
  const excluded = permanentlyExcluded([
    { driverId: 'a', reason: 'declined' },
    { driverId: 'b', reason: 'timeout' },
    { driverId: 'c', reason: 'disconnected' },
  ]);

  assert.deepEqual(excluded, ['a']);
});

test('offers go to candidates in order', () => {
  const { candidate, index } = selectNextCandidate({ candidates });

  assert.equal(candidate.driverId, 'a');
  assert.equal(index, 0);
});

test('scanning resumes after the driver who just answered', () => {
  const { candidate, index } = selectNextCandidate({ candidates, fromIndex: 1 });

  assert.equal(candidate.driverId, 'b');
  assert.equal(index, 1);
});

test('offline or busy drivers are skipped, not offered and timed out', () => {
  const { candidate } = selectNextCandidate({
    candidates,
    isEligible: (driverId) => driverId === 'c',
  });

  assert.equal(candidate.driverId, 'c');
});

test('excluded drivers are passed over', () => {
  const { candidate } = selectNextCandidate({ candidates, excluded: ['a', 'b'] });

  assert.equal(candidate.driverId, 'c');
});

test('an exhausted list yields no candidate', () => {
  assert.equal(selectNextCandidate({ candidates, fromIndex: 3 }), null);
  assert.equal(selectNextCandidate({ candidates: [] }), null);
  assert.equal(
    selectNextCandidate({ candidates, isEligible: () => false }),
    null,
  );
});

test('rounds continue until the cap, then stop', () => {
  assert.equal(shouldStartNewRound({ round: 0, maxRounds: 3 }), true);
  assert.equal(shouldStartNewRound({ round: 1, maxRounds: 3 }), true);
  assert.equal(shouldStartNewRound({ round: 2, maxRounds: 3 }), false);
});

test('an offer expires a fixed window after it is made', () => {
  const now = new Date('2026-09-11T10:00:00.000Z');

  assert.equal(offerExpiry(now, 30_000).toISOString(), '2026-09-11T10:00:30.000Z');
});

const liveOffer = {
  state: 'offered',
  driverId: null,
  currentOffer: {
    driverId: 'a',
    offerToken: 'tok',
    expiresAt: new Date('2026-09-11T10:00:30.000Z'),
  },
};
const duringOffer = new Date('2026-09-11T10:00:10.000Z');

test('the driver holding a live offer may accept it', () => {
  const reason = acceptRejectionReason(liveOffer, {
    driverId: 'a',
    offerToken: 'tok',
    now: duringOffer,
  });

  assert.equal(reason, null);
});

test('a second driver cannot take an order that is already assigned', () => {
  const reason = acceptRejectionReason(
    { ...liveOffer, state: 'accepted', driverId: 'a', currentOffer: null },
    { driverId: 'b', offerToken: 'tok', now: duringOffer },
  );

  assert.equal(reason, 'already_taken');
});

test('a driver cannot accept an offer that was made to someone else', () => {
  const reason = acceptRejectionReason(liveOffer, {
    driverId: 'b',
    offerToken: 'tok',
    now: duringOffer,
  });

  assert.equal(reason, 'offered_to_another_driver');
});

test('a replayed token from an earlier round is refused', () => {
  const reason = acceptRejectionReason(liveOffer, {
    driverId: 'a',
    offerToken: 'previous-round-token',
    now: duringOffer,
  });

  assert.equal(reason, 'stale_offer');
});

test('accepting after the countdown ends is refused', () => {
  const reason = acceptRejectionReason(liveOffer, {
    driverId: 'a',
    offerToken: 'tok',
    now: new Date('2026-09-11T10:00:31.000Z'),
  });

  assert.equal(reason, 'expired');
});

test('an order still searching has no offer to accept', () => {
  const reason = acceptRejectionReason(
    { state: 'searching', currentOffer: null },
    { driverId: 'a', offerToken: 'tok', now: duringOffer },
  );

  assert.equal(reason, 'no_longer_offered');
});

test('distance is measured between [lng, lat] pairs', () => {
  // Colombo to Kandy, roughly 94 km apart.
  const colombo = [79.8612, 6.9271];
  const kandy = [80.6337, 7.2906];

  const metres = distanceMeters(colombo, kandy);

  assert.ok(metres > 90_000 && metres < 100_000, `got ${metres}`);
});

test('distance is null when a coordinate is missing', () => {
  assert.equal(distanceMeters(null, [1, 2]), null);
  assert.equal(distanceMeters([1, 2], undefined), null);
});

test('candidates keep the nearest-first order and drop duplicates', () => {
  const origin = [79.8612, 6.9271];
  const result = toCandidates(
    [
      { _id: 'a', position: { coordinates: [79.8612, 6.9271] } },
      { _id: 'b', position: { coordinates: [80.6337, 7.2906] } },
      { _id: 'a', position: { coordinates: [79.8612, 6.9271] } },
    ],
    origin,
  );

  assert.deepEqual(
    result.map((candidate) => candidate.driverId),
    ['a', 'b'],
  );
  assert.equal(result[0].distance, 0);
  assert.ok(result[1].distance > 90_000);
});

test('drivers without an id are dropped rather than offered to', () => {
  assert.deepEqual(toCandidates([{ position: { coordinates: [1, 2] } }]), []);
});

test('a connected driver the geo query missed is still reachable, after the near ones', () => {
  const nearby = [{ driverId: 'near', distance: 1200 }];

  const merged = withConnectedFallback(nearby, ['near', 'connected-but-stale']);

  assert.deepEqual(
    merged.map((candidate) => candidate.driverId),
    ['near', 'connected-but-stale'],
  );
  assert.equal(merged[1].fallback, true);
  assert.equal(merged[1].distance, null);
});

test('a driver already in the geo result is not offered the order twice', () => {
  const merged = withConnectedFallback([{ driverId: 'a', distance: 500 }], ['a']);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].distance, 500);
});

test('an order with no nearby drivers still reaches whoever is online', () => {
  const merged = withConnectedFallback([], ['only-online-driver']);

  assert.deepEqual(
    merged.map((candidate) => candidate.driverId),
    ['only-online-driver'],
  );
});

test('nothing is invented when nobody is connected', () => {
  assert.deepEqual(withConnectedFallback([], []), []);
});
