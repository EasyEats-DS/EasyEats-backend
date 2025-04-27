const Driver = require('../models/Driver');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');

async function getMapData() {
  const [driversResponse, restaurantsResponse] = await Promise.all([
    //Driver.find({ status: 'available' }).lean(),
    //Restaurant.find().lean()
     axios.get('http://localhost:5003/users/'),
     axios.get('http://localhost:5003/restaurants/')

  ]);
  const availableDrivers = driversResponse.data.data.data.users; // Extract data properly
  const restaurants = restaurantsResponse.data; // Depends on how your API responds!
  return { availableDrivers, restaurants };
}

module.exports = { getMapData };