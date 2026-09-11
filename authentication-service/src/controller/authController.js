const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { RevokedToken, hashToken } = require('../models/revokedTokenModel');

exports.login = async (loginData) => {
  try {
    const { email, password } = loginData;
    console.log('Login data:', loginData);

    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    // Find user with password
    const user = await User.findOne({ email })//.select('+password');

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
    console.log('Token payload:', { id: user._id, email: user.email, role: user.role });

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
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

/**
 * Revokes a token so the gateway stops accepting it.
 *
 * Deliberately forgiving about tokens that are already unusable: an expired or
 * malformed token is the outcome logout is trying to produce, so reporting it
 * as a failure would only leave the client stuck on a signed-in screen.
 */
exports.logout = async ({ token }) => {
  if (!token) {
    const error = new Error('A token is required to log out');
    error.statusCode = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Already dead -- nothing left to revoke, and nothing worth failing over.
    console.log('Logout presented a token that is not valid:', error.message);
    return { revoked: false, reason: 'token already invalid' };
  }

  // `exp` is in seconds; without one, fall back to an hour so the row still
  // carries a TTL and cannot linger in the collection forever.
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 60 * 60 * 1000);

  // Upsert: logging out twice is not an error worth surfacing to the user.
  await RevokedToken.updateOne(
    { tokenHash: hashToken(token) },
    { $set: { userId: decoded.id, expiresAt } },
    { upsert: true }
  );

  console.log('Revoked token for user:', decoded.id);
  return { revoked: true };
};
