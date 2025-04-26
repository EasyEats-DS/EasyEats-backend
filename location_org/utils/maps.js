const Driver = require('../models/Driver');
const Restaurant = require('../models/Restaurant');

async function getMapData() {
  const [availableDrivers, restaurants] = await Promise.all([
    Driver.find({ status: 'available' }).lean(),
    Restaurant.find().lean()
  ]);
  return { availableDrivers, restaurants };
}

module.exports = { getMapData };