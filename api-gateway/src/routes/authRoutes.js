const express = require('express');
const router = express.Router();
const { sendMessageWithResponse } = require('../services/kafkaService');

router.post('/login', async (req, res) => {
  try {
    console.log("Processing login request with data:", req.body);
    
    const result = await sendMessageWithResponse('auth-requests', {
      action: 'login',
      payload: req.body
    });
    
    console.log("Login successful, returning result:", result);
    
    // Return the token and user data
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

module.exports = router;