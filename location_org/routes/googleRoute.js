// routes/googleRoute.js
const express = require('express');
const axios = require('axios');
const polyline = require('@mapbox/polyline');
const router = express.Router();

const {
  parseCoordinates,
  straightLine,
  osrmToLatLngPath,
  osrmSummary,
} = require('../utils/routing');

/**
 * Driving routes for the driver's map.
 *
 * OSRM is the default because it needs no credentials, so navigation works on a
 * fresh checkout with nothing configured. Google is used only when a key is
 * present in the environment -- it used to be hardcoded in this file and
 * committed, which is why it is read from the environment now and nowhere else.
 *
 * If no provider answers, the straight line between the two points is returned
 * rather than an error: the driver still sees where they are going, and a
 * visibly straight line reads as "no road route" instead of a broken map.
 */

const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const ROUTE_TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS) || 6000;

async function routeViaOsrm(origin, destination) {
  const path = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  const { data } = await axios.get(`${OSRM_URL}/route/v1/driving/${path}`, {
    params: { overview: 'full', geometries: 'geojson' },
    timeout: ROUTE_TIMEOUT_MS,
  });

  const route = data?.routes?.[0];
  const decoded = osrmToLatLngPath(route?.geometry);
  if (!decoded) return null;

  return { route: decoded, provider: 'osrm', ...osrmSummary(route) };
}

async function routeViaGoogle(origin, destination) {
  if (!GOOGLE_API_KEY) return null;

  // Google takes "lat,lng", the reverse of the GeoJSON order used everywhere else.
  const { data } = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: `${origin[1]},${origin[0]}`,
      destination: `${destination[1]},${destination[0]}`,
      key: GOOGLE_API_KEY,
    },
    timeout: ROUTE_TIMEOUT_MS,
  });

  const route = data?.routes?.[0];
  if (!route?.overview_polyline?.points) return null;

  const leg = route.legs?.[0];
  return {
    route: polyline.decode(route.overview_polyline.points),
    provider: 'google',
    distanceMeters: leg?.distance?.value ?? null,
    durationSeconds: leg?.duration?.value ?? null,
  };
}

router.get('/route', async (req, res) => {
  const origin = parseCoordinates(req.query.origin);
  const destination = parseCoordinates(req.query.destination);

  if (!origin || !destination) {
    return res.status(400).json({
      error: 'origin and destination are required as "longitude,latitude" pairs',
    });
  }

  // Google first when configured, since a paid key is presumably there to be
  // used; OSRM otherwise, and always as the fallback.
  for (const provider of [routeViaGoogle, routeViaOsrm]) {
    try {
      const result = await provider(origin, destination);
      if (result) return res.json(result);
    } catch (error) {
      console.warn(`[route] ${provider.name} failed:`, error.message);
    }
  }

  console.warn('[route] no provider returned a route; falling back to a straight line');
  return res.json({
    route: straightLine(origin, destination),
    provider: 'straight-line',
    distanceMeters: null,
    durationSeconds: null,
    degraded: true,
  });
});

module.exports = router;
