const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ message: 'Forbidden' });
  }
};

module.exports = verifyToken;