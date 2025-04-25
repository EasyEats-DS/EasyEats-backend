const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    // Decode the token without verification first to log what's in it
    const decodedToken = jwt.decode(token);
    console.log('Token payload:', decodedToken);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Verified token data:', decoded);
    
  
    if (!decoded.role) {
      console.error('No role found in token');
      return res.status(403).json({ message: 'Invalid token: missing role' });
    }
    
    // Use role directly from the token instead of fetching from DB
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    // console.log('User authenticated with role from token:', req.user.role);
    
    // Optionally verify the user exists in DB without overriding token role
    // const user = await User.findById(decoded.id).select('-password');
    // console.log('User fetched from DBsasasassa:', user);
    // if (!user) {
    //   return res.status(404).json({ message: 'User not found' });
    // }
   
    // if (user.role !== decoded.role) {
    //   console.warn(`Warning: DB role (${user.role}) doesn't match token role (${decoded.role})`);
    // }
    
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ message: 'Forbidden' });
  }
};

module.exports = verifyToken;