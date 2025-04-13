const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

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
router.get('/:id', async (req, res) => {
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

module.exports = router;