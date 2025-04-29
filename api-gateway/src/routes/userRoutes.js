const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware'); 

// Create a new user
router.post('/', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('user-request', {
      action: 'createUser',
      payload: req.body
    });
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating user:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error creating user' 
    });
  }
});



// Get user by ID
router.get('/:id',verifyToken,async (req, res) => {
  try {
    const result = await sendMessageWithResponse('user-request', {
      action: 'getUser',
      payload: { userId: req.params.id }
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return res.status(500).json({ 
      message: error.message || 'Error fetching user' 
    });
  }
});

// Get all users with pagination
router.get('/', verifyToken,authorizeRoles('ADMIN') ,async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await sendMessageWithResponse('user-request', {
      action: 'getUsers',
      payload: { page, limit }
    });

    // Ensure we're returning the data in a consistent format
    return res.status(200).json({
      data: result
    });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Error fetching users' 
    });
  }
});

// Update user by ID
router.put('/:id', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('user-request', {
      action: 'updateUser',
      payload: {
        userId: req.params.id,
        userData: req.body
      },
      correlationId: req.headers['x-correlation-id'] || Date.now().toString()
    });
    console.log('Update user result:', result);
    // Ensure a proper response format
    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    console.error('Error updating user:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error updating user' 
    });
  }
});

// Delete user by ID
router.delete('/:id', async (req, res) => {
  try {
    const result = await sendMessageWithResponse('user-request', {
      action: 'deleteUser',
      payload: { userId: req.params.id },
      correlationId: req.headers['x-correlation-id'] || Date.now().toString()
    });
    console.log('Delete user result:', result);
    
        // Return a proper JSON response (204 No Content typically has no body)
        return res.status(200).json({ 
          data: result
        });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return res.status(error.statusCode || 500).json({ 
      message: error.message || 'Error deleting user' 
    });
  }
});

module.exports = router;
