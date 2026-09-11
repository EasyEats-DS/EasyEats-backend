const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

router.post('/login', async (req, res) => {
  try {
    const result = await authController.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.body?.token;

    const result = await authController.logout({ token });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message
    });
  }
});

module.exports = router;