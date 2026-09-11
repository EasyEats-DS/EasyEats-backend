'use strict';

/**
 * Coordinate handling and fallbacks for route lookups.
 *
 * Kept separate from the HTTP call so the parsing and the degraded paths can be
 * exercised without a network or an API key.
 */

/** Parses "lng,lat" or [lng, lat] into a validated [lng, lat] pair. */
function parseCoordinates(input) {
  const parts = Array.isArray(input) ? input : String(input ?? '').split(',');
  if (parts.length !== 2) return null;

  const [lng, lat] = parts.map((value) => Number(String(value).trim()));
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  // Rejects only what cannot exist. A swapped [lat, lng] pair usually still
  // falls inside these bounds and is indistinguishable from a real location,
  // so callers are responsible for passing GeoJSON order.
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return [lng, lat];
}

/**
 * The straight line between two points, as a Leaflet-ready [lat, lng] path.
 *
 * Used when no routing provider answers. A straight line is visibly not a road
 * route, which is the honest way to show "we know both ends but not the path"
 * -- better than an empty map that looks like the feature is broken.
 */
function straightLine(origin, destination) {
  return [
    [origin[1], origin[0]],
    [destination[1], destination[0]],
  ];
}

/** OSRM returns GeoJSON [lng, lat]; Leaflet wants [lat, lng]. */
function osrmToLatLngPath(geometry) {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

  return coordinates
    .filter((pair) => Array.isArray(pair) && pair.length === 2)
    .map(([lng, lat]) => [lat, lng]);
}

/** Seconds and metres from an OSRM route, when present. */
function osrmSummary(route) {
  return {
    distanceMeters: Number.isFinite(route?.distance) ? Math.round(route.distance) : null,
    durationSeconds: Number.isFinite(route?.duration) ? Math.round(route.duration) : null,
  };
}

module.exports = {
  parseCoordinates,
  straightLine,
  osrmToLatLngPath,
  osrmSummary,
};
