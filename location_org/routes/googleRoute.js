// routes/googleRoute.js
const express = require('express');
const axios = require('axios');
const polyline = require('@mapbox/polyline');
const router = express.Router();

const GOOGLE_API_KEY = 'AIzaSyAMexYs-UBINkqhARyu0nwxgc1VinFmS8c'; // Replace with your real key

router.get('/route', async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json`,
      {
        params: {
          origin,
          destination,
          key: GOOGLE_API_KEY,
        },
      }
    );

    const route = response.data.routes[0];
    const encodedPolyline = route.overview_polyline.points;

    const decodedPath = polyline.decode(encodedPolyline);

    res.json({ route: decodedPath });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get route' });
  }
});


module.exports = router;
