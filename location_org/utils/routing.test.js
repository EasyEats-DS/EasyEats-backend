'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCoordinates,
  straightLine,
  osrmToLatLngPath,
  osrmSummary,
} = require('./routing');

test('coordinates parse from a query string or an array', () => {
  assert.deepEqual(parseCoordinates('80.443,6.543'), [80.443, 6.543]);
  assert.deepEqual(parseCoordinates([80.443, 6.543]), [80.443, 6.543]);
  assert.deepEqual(parseCoordinates(' 80.443 , 6.543 '), [80.443, 6.543]);
});

test('impossible coordinates are rejected', () => {
  // Only genuine impossibilities: a latitude beyond the poles or a longitude
  // past the antimeridian. A merely unlikely pair is still a real place, so
  // guessing that it is "swapped" would break perfectly valid locations.
  assert.equal(parseCoordinates('80.443,95'), null);
  assert.equal(parseCoordinates('200,6.543'), null);
});

test('unusable input yields null instead of a guess', () => {
  assert.equal(parseCoordinates(''), null);
  assert.equal(parseCoordinates(undefined), null);
  assert.equal(parseCoordinates('80.443'), null);
  assert.equal(parseCoordinates('here,there'), null);
});

test('the straight-line fallback is returned in Leaflet order', () => {
  const path = straightLine([80.443, 6.543], [79.861, 6.927]);

  assert.deepEqual(path, [
    [6.543, 80.443],
    [6.927, 79.861],
  ]);
});

test('an OSRM geometry is flipped into Leaflet order', () => {
  const path = osrmToLatLngPath({
    coordinates: [
      [80.443, 6.543],
      [80.1, 6.7],
    ],
  });

  assert.deepEqual(path, [
    [6.543, 80.443],
    [6.7, 80.1],
  ]);
});

test('an empty or malformed geometry yields null so the caller can fall back', () => {
  assert.equal(osrmToLatLngPath(undefined), null);
  assert.equal(osrmToLatLngPath({ coordinates: [] }), null);
});

test('distance and duration are rounded, or null when absent', () => {
  assert.deepEqual(osrmSummary({ distance: 1234.6, duration: 300.2 }), {
    distanceMeters: 1235,
    durationSeconds: 300,
  });
  assert.deepEqual(osrmSummary({}), { distanceMeters: null, durationSeconds: null });
});
