const jwt = require('jsonwebtoken');
// const User = require('../models/userModel');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Just verify the JWT - no DB lookup
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the decoded token to req.user
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    return res.status(403).json({ message: 'Forbidden' });
  }
};

module.exports = verifyToken;