const Restaurant = require('../models/Restaurant');

exports.getAllRestaurants = async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;
    
    let restaurants;
    if (lng && lat) {
      restaurants = await Restaurant.findNearby([parseFloat(lng), parseFloat(lat)], parseInt(radius));
    } else {
      restaurants = await Restaurant.find();
    }
    
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRestaurant = async (req, res) => {
  try {
    const restaurant = new Restaurant({
      ...req.body,
      position: {
        type: 'Point',
        coordinates: req.body.position
      }
    });
    
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRestaurantById = async(Id) => {
  try {
    const restaurant = await Restaurant.findById(Id);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    return restaurant;
  } catch (err) {
    throw new Error(err.message);
  }
}

exports.initializeSampleRestaurants = async () => {
  const count = await Restaurant.countDocuments();
  if (count === 0) {
    const sampleRestaurants = [
      {
        placeId: 'REST001',
        name: 'Burger King',
        position: [6.9280,79.8620],
        address: '123 Main St',
        cuisineType: ['Fast Food', 'Japanese'],
        rating: 4.2
      },
      {
        placeId: 'REST002',
        name: 'Pizza Hut',
        position: [7.2910, 80.6350 ],
        address: '456 Oak Ave',
        cuisineType: ['Italian', 'Pizza'],
        rating: 4.0
      }
    ];
    await Restaurant.insertMany(sampleRestaurants);
    console.log('Sample restaurants initialized');
  }
};