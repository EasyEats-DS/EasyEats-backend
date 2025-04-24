const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.login = async (loginData) => {
  try {
    const { email, password } = loginData;

    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      token,
      user: userResponse
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};