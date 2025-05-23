const Restaurant = require('../models/resturantModel');
const { produceMessage } = require('../services/kafkaService');


exports.createRestaurant = async (restaurantData) => {
  try {
    const { name, ownerId } = restaurantData;
    
    if (!name || !ownerId) {
      throw new Error('Missing required fields: name and ownerId');
    }
    
    const newRestaurant = new Restaurant(restaurantData);
    const savedRestaurant = await newRestaurant.save();
    
    // Populate owner details before returning
    await savedRestaurant.populate('ownerId', 'name email');
    
    // Send message to Kafka for owner validation
    await produceMessage('user-restaurant', {
      restaurantId: savedRestaurant._id.toString(),
      userId: ownerId,
      action: 'validate_owner',
      timestamp: new Date().toISOString()
    });
    
    return savedRestaurant;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
};

exports.getRestaurantById = async (restaurantId) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId)
      .populate('ownerId', 'name email');
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    return restaurant;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    throw error;
  }
};

exports.updateRestaurant = async (restaurantId, updateData) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Prevent changing ownerId
    if (updateData.ownerId && updateData.ownerId.toString() !== restaurant.ownerId.toString()) {
      throw new Error('Cannot change restaurant owner');
    }
    
    Object.assign(restaurant, updateData);
    restaurant.updatedAt = Date.now();
    
    const updatedRestaurant = await restaurant.save();
    await updatedRestaurant.populate('ownerId', 'name email');
    
    return updatedRestaurant;
  } catch (error) {
    console.error('Error updating restaurant:', error);
    throw error;
  }
};

exports.getRestaurantsByOwner = async (ownerId) => {
  try {
    const restaurants = await Restaurant.find({ ownerId })
      .populate('ownerId', 'name email')
      .select('-menu -createdAt -updatedAt -__v');
    
    return restaurants;
  } catch (error) {
    console.error('Error fetching restaurants by owner:', error);
    throw error;
  }
};

exports.addMenuItem = async (restaurantId, menuItem) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    restaurant.menu.push(menuItem);
    restaurant.updatedAt = Date.now();
    
    const updatedRestaurant = await restaurant.save();
    await updatedRestaurant.populate('ownerId', 'name email');
    
    return updatedRestaurant;
  } catch (error) {
    console.error('Error adding menu item:', error);
    throw error;
  }
};

exports.updateMenuItem = async (restaurantId, menuItemId, updateData) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    const menuItem = restaurant.menu.id(menuItemId);
    if (!menuItem) {
      const error = new Error('Menu item not found');
      error.statusCode = 404;
      throw error;
    }
    
    Object.assign(menuItem, updateData);
    restaurant.updatedAt = Date.now();
    
    const updatedRestaurant = await restaurant.save();
    await updatedRestaurant.populate('ownerId', 'name email');
    
    return updatedRestaurant;
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw error;
  }
};

exports.deleteRestaurantById = async (restaurantId) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(restaurantId);
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Send message to Kafka about restaurant deletion
    await produceMessage('restaurant-status', {
      restaurantId: restaurant._id.toString(),
      userId: restaurant.ownerId.toString(),
      status: 'deleted',
      timestamp: new Date().toISOString()
    });
    
    return { message: 'Restaurant deleted successfully' };
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    throw error;
  }
};

exports.getAllRestaurants = async () => {
  try {
    const restaurants = await Restaurant.find({})
      .populate('ownerId', 'name email')
      .select('-menu -createdAt -updatedAt -__v');
    
    return restaurants;
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    throw error;
  }
};

// Fetch all menu items for a specific restaurant by ID
exports.getRestaurantMenu = async (restaurantId) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId)
      .select('menu name _id');
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    return {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      menu: restaurant.menu
    };
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    throw error;
  }
};

exports.deleteMenuItem = async (restaurantId, menuItemId) => {
  try {
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      throw error;
    }
    
    const menuItemIndex = restaurant.menu.findIndex(item => item._id.toString() === menuItemId);
    if (menuItemIndex === -1) {
      const error = new Error('Menu item not found');
      error.statusCode = 404;
      throw error;
    }
    
    restaurant.menu.splice(menuItemIndex, 1);
    restaurant.updatedAt = Date.now();
    
    const updatedRestaurant = await restaurant.save();
    await updatedRestaurant.populate('ownerId', 'name email');
    
    return updatedRestaurant;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};


exports.getAllRestaurants = async (query) => {
  try {
    const { page = 1, limit = 10, ...filters } = query;
    const skip = (page - 1) * limit;
    
    const restaurants = await Restaurant.find()
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name email')
      .select('-__v');
    
    const totalRestaurants = await Restaurant.countDocuments(filters);
    
    // return {
    //   restaurants,
    //   //totalPages: Math.ceil(totalRestaurants / limit),
    //   //currentPage: page
    // };
    return restaurants;
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
};

