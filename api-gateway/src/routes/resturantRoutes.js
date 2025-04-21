const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

// Create a new restaurant
router.post('/', async (req, res) => {
  try {
    // First validate the owner exists
    const ownerValidation = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      payload: { userId: req.body.ownerId }
    });
    
    if (!ownerValidation.user) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    
    // If owner is valid, create the restaurant
    const restaurantResult = await sendMessageWithResponse('restaurant-request', {
      action: 'createRestaurant',
      payload: req.body
    });
    
    return res.status(201).json(restaurantResult);
  } catch (error) {
    console.error('Error creating restaurant:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error creating restaurant' 
    });
  }
});

// Get restaurant by ID
router.get('/:id', async (req, res) => {
  try {
    const restaurantResult = await sendMessageWithResponse('restaurant-request', {
      action: 'getRestaurant',
      payload: { id: req.params.id }
    });
    
    return res.json(restaurantResult);
  } catch (error) {
    console.error('Error fetching restaurant:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error fetching restaurant' 
    });
  }
});

// Update restaurant
router.put('/:id', async (req, res) => {
  try {
    const restaurantResult = await sendMessageWithResponse('restaurant-request', {
      action: 'updateRestaurant',
      payload: {
        id: req.params.id,
        updateData: req.body
      }
    });
    
    return res.json(restaurantResult);
  } catch (error) {
    console.error('Error updating restaurant:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error updating restaurant' 
    });
  }
});

// Get restaurants by owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const ownerValidation = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      payload: { userId: req.params.ownerId }
    });
    
    if (!ownerValidation.user) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    
    const restaurantsResult = await sendMessageWithResponse('restaurant-request', {
      action: 'getRestaurantsByOwner',
      payload: { ownerId: req.params.ownerId }
    });
    
    return res.json(restaurantsResult);
  } catch (error) {
    console.error('Error fetching restaurants by owner:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error fetching restaurants by owner' 
    });
  }
});

// Add menu item to restaurant
router.post('/:id/menu', async (req, res) => {
  try {
    const menuItemResult = await sendMessageWithResponse('restaurant-request', {
      action: 'addMenuItem',
      payload: {
        restaurantId: req.params.id,
        menuItem: req.body
      }
    });
    
    return res.status(201).json(menuItemResult);
  } catch (error) {
    console.error('Error adding menu item:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error adding menu item' 
    });
  }
});

// Update menu item
router.put('/:id/menu/:menuItemId', async (req, res) => {
  try {
    const menuItemResult = await sendMessageWithResponse('restaurant-request', {
      action: 'updateMenuItem',
      payload: {
        restaurantId: req.params.id,
        menuItemId: req.params.menuItemId,
        updateData: req.body
      }
    });
    
    return res.json(menuItemResult);
  } catch (error) {
    console.error('Error updating menu item:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error updating menu item' 
    });
  }
});

module.exports = router;